-- Rework: drop foreigner/local roles, buddies by request -> accept, chat onboarding,
-- AI intros, safety share, and server-only writes for anything AI- or quota-related.
-- Server routes write server-owned data with the service-role key (bypasses RLS);
-- signed-in users only get the writes granted explicitly below.

------------------------------------------------------------------------------
-- quotas: one generic counter for AI spend and per-user limits (service role only)
------------------------------------------------------------------------------
create table public.quotas (
  key text not null,
  window_start timestamptz not null,
  n int not null default 0,
  primary key (key, window_start)
);
alter table public.quotas enable row level security;

create or replace function public.quota_take(p_key text, p_window interval, p_limit int, p_n int default 1)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := date_bin(p_window, now(), timestamptz '2000-01-01');
  taken int;
begin
  insert into quotas (key, window_start, n) values (p_key, w, p_n)
  on conflict (key, window_start) do update set n = quotas.n + p_n
    where quotas.n + p_n <= p_limit
  returning n into taken;
  return taken is not null and taken <= p_limit;
end $$;
revoke execute on function public.quota_take(text, interval, int, int) from public, anon, authenticated;

------------------------------------------------------------------------------
-- contacts: LINE ids move out of profiles; readable only by people you're connected to
------------------------------------------------------------------------------
create table public.contacts (
  user_id uuid primary key references public.profiles on delete cascade,
  line_id text not null check (char_length(line_id) between 1 and 60)
);
alter table public.contacts enable row level security;

insert into public.contacts (user_id, line_id)
select id, left(trim(line_id), 60) from public.profiles
where line_id is not null and trim(line_id) <> '';

------------------------------------------------------------------------------
-- profiles: no roles, AI-filled fields, users may only edit name + UI language
------------------------------------------------------------------------------
alter table public.profiles drop column role;
alter table public.profiles drop column line_id;
alter table public.profiles
  add column bio text check (char_length(bio) <= 300),
  add column interests text[] not null default '{}',
  add column offers text check (char_length(offers) <= 300),
  add column wants text check (char_length(wants) <= 300),
  add column languages jsonb not null default '[]',
  add column onboarded_at timestamptz;

drop policy "own profile insert" on public.profiles;
drop policy "users update own language" on public.profiles;
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, language) on public.profiles to authenticated;

-- profiles (and contacts) are created from signup metadata, so it also works with email confirmation on
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  line text := left(trim(coalesce(meta->>'line_id', '')), 60);
begin
  insert into profiles (id, display_name, language)
  values (
    new.id,
    coalesce(nullif(left(trim(meta->>'display_name'), 60), ''), split_part(new.email, '@', 1)),
    case when meta->>'language' in ('en', 'th', 'zh') then meta->>'language' else 'en' end
  )
  on conflict (id) do nothing;
  if line <> '' then
    insert into contacts (user_id, line_id) values (new.id, line) on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.onboarding_sessions (
  user_id uuid primary key references public.profiles on delete cascade,
  transcript jsonb not null default '[]',
  turns int not null default 0,
  done_at timestamptz
);
alter table public.onboarding_sessions enable row level security;
create policy "own onboarding read" on public.onboarding_sessions for select to authenticated
  using (user_id = auth.uid());

------------------------------------------------------------------------------
-- events: server-written only; three equal summary languages
------------------------------------------------------------------------------
alter table public.events rename column description_en to description_raw;
alter table public.events rename column description_th to summary_th;
alter table public.events rename column description_zh to summary_zh;
alter table public.events
  add column summary_en text,
  add column ends_at timestamptz,
  add column is_free boolean,
  add column lat double precision,
  add column lng double precision,
  add column language text,
  add column timezone text,
  add column facts jsonb;

drop policy "auth insert events" on public.events;
revoke insert, update, delete on public.events from anon, authenticated;

create table public.luma_imports (
  cell text primary key,
  fetched_at timestamptz not null default now()
);
alter table public.luma_imports enable row level security;

------------------------------------------------------------------------------
-- attendances ("I'm going") replace offers
------------------------------------------------------------------------------
create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.attendances enable row level security;

insert into public.attendances (event_id, user_id, note, created_at)
select event_id, foreigner_id, left(mission, 200), created_at from public.offers;
insert into public.attendances (event_id, user_id, note, created_at)
select o.event_id, m.local_id, left(m.local_mission, 200), m.created_at
from public.matches m join public.offers o on o.id = m.offer_id
on conflict (event_id, user_id) do nothing;

create policy "auth read attendances" on public.attendances for select to authenticated using (true);
create policy "own attendance insert" on public.attendances for insert to authenticated
  with check (user_id = auth.uid());
create policy "own attendance update" on public.attendances for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own attendance delete" on public.attendances for delete to authenticated
  using (user_id = auth.uid());
revoke insert, update on public.attendances from anon, authenticated;
grant insert (event_id, user_id, note), update (note) on public.attendances to authenticated;

------------------------------------------------------------------------------
-- buddy_requests replace matches (old match ids are kept so reviews can follow)
------------------------------------------------------------------------------
create table public.buddy_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  from_id uuid not null default auth.uid() references public.profiles on delete cascade,
  to_id uuid not null references public.profiles on delete cascade,
  note text check (char_length(note) <= 200),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  icebreakers jsonb,
  created_at timestamptz not null default now(),
  unique (event_id, from_id, to_id),
  check (from_id <> to_id)
);
alter table public.buddy_requests enable row level security;

insert into public.buddy_requests (id, event_id, from_id, to_id, status, created_at)
select m.id, o.event_id, m.local_id, o.foreigner_id, 'accepted', m.created_at
from public.matches m join public.offers o on o.id = m.offer_id
where m.local_id <> o.foreigner_id;

create policy "participants read buddy requests" on public.buddy_requests for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy "attendee sends buddy request" on public.buddy_requests for insert to authenticated
  with check (
    from_id = auth.uid()
    and status = 'pending'
    and icebreakers is null
    and exists (select 1 from public.attendances a where a.event_id = buddy_requests.event_id and a.user_id = from_id)
    and exists (select 1 from public.attendances a where a.event_id = buddy_requests.event_id and a.user_id = to_id)
  );
create policy "recipient answers buddy request" on public.buddy_requests for update to authenticated
  using (to_id = auth.uid() and status = 'pending')
  with check (to_id = auth.uid() and status in ('accepted', 'declined'));
create policy "participants delete buddy request" on public.buddy_requests for delete to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
revoke insert, update on public.buddy_requests from anon, authenticated;
grant insert (event_id, from_id, to_id, note), update (status) on public.buddy_requests to authenticated;

------------------------------------------------------------------------------
-- DB-level write rate limits (direct PostgREST calls can't skip them)
------------------------------------------------------------------------------
create or replace function public.enforce_write_rate()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  lim int := tg_argv[1]::int;
  recent int;
begin
  execute format('select count(*) from %I where %I = $1 and created_at > now() - interval ''1 hour''',
                 tg_table_name, tg_argv[0])
    into recent using (to_jsonb(new) ->> tg_argv[0])::uuid;
  if recent >= lim then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger attendances_rate before insert on public.attendances
  for each row execute function public.enforce_write_rate('user_id', '30');
create trigger buddy_requests_rate before insert on public.buddy_requests
  for each row execute function public.enforce_write_rate('from_id', '10');

------------------------------------------------------------------------------
-- reviews follow buddy requests; only after the event started
------------------------------------------------------------------------------
drop policy "participants review each other" on public.reviews;
alter table public.reviews add column buddy_request_id uuid references public.buddy_requests on delete cascade;
update public.reviews set buddy_request_id = match_id;
delete from public.reviews where buddy_request_id is null
  or buddy_request_id not in (select id from public.buddy_requests);
alter table public.reviews alter column buddy_request_id set not null;
alter table public.reviews drop column match_id;
alter table public.reviews add constraint reviews_request_reviewer_key unique (buddy_request_id, reviewer_id);

create policy "buddies review each other after start" on public.reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.buddy_requests b
      join public.events e on e.id = b.event_id
      where b.id = buddy_request_id
        and b.status = 'accepted'
        and e.starts_at < now()
        and ((b.from_id = auth.uid() and reviewee_id = b.to_id)
          or (b.to_id = auth.uid() and reviewee_id = b.from_id))
    )
  );

------------------------------------------------------------------------------
-- old offer/match model goes away completely
------------------------------------------------------------------------------
drop trigger on_match_created on public.matches;
drop trigger on_match_deleted on public.matches;
drop function public.mark_offer_matched();
drop function public.reopen_offer_on_unmatch();
drop table public.matches;
drop table public.offers;

------------------------------------------------------------------------------
-- contacts visibility: yourself, accepted buddies, accepted project teammates
------------------------------------------------------------------------------
create policy "connected read contacts" on public.contacts for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.buddy_requests b
      where b.status = 'accepted'
        and ((b.from_id = auth.uid() and b.to_id = contacts.user_id)
          or (b.to_id = auth.uid() and b.from_id = contacts.user_id))
    )
    or exists (
      select 1 from public.project_requests r
      join public.projects p on p.id = r.project_id
      where r.status = 'accepted'
        and ((r.requester_id = auth.uid() and p.owner_id = contacts.user_id)
          or (p.owner_id = auth.uid() and r.requester_id = contacts.user_id)
          or (r.requester_id = contacts.user_id and exists (
                select 1 from public.project_requests mine
                where mine.project_id = p.id and mine.requester_id = auth.uid() and mine.status = 'accepted')))
    )
  );
revoke insert, update, delete on public.contacts from anon, authenticated;

------------------------------------------------------------------------------
-- projects: created by the server (Claude writes the listing); owners may only close
------------------------------------------------------------------------------
alter table public.projects
  add column suggestions jsonb,
  add column title_th text,
  add column title_zh text,
  add column looking_for_th text,
  add column looking_for_zh text;
drop policy "owner creates project" on public.projects;
revoke insert, update, delete on public.projects from anon, authenticated;
grant update (status) on public.projects to authenticated;

-- fix: requesters could insert an already-accepted request and read the owner's LINE id
drop policy "requester creates request" on public.project_requests;
create policy "requester creates request" on public.project_requests for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
revoke insert, update on public.project_requests from anon, authenticated;
grant insert (project_id, requester_id, mission), update (status) on public.project_requests to authenticated;

------------------------------------------------------------------------------
-- safety share: sessions are created/ended by the server; positions are never stored
------------------------------------------------------------------------------
create table public.share_sessions (
  id uuid primary key default gen_random_uuid(),
  buddy_request_id uuid not null references public.buddy_requests on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  token text not null unique,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.share_sessions enable row level security;
create policy "own share sessions read" on public.share_sessions for select to authenticated
  using (user_id = auth.uid());

create or replace function public.get_share_session(p_token text)
returns table (
  display_name text,
  event_title text,
  venue text,
  lat double precision,
  lng double precision,
  closes_at timestamptz,
  active boolean
) language sql stable security definer set search_path = public as $$
  select p.display_name, e.title, e.location, e.lat, e.lng, s.closes_at,
         (s.ended_at is null and now() between s.opens_at and s.closes_at)
  from share_sessions s
  join profiles p on p.id = s.user_id
  join buddy_requests b on b.id = s.buddy_request_id
  join events e on e.id = b.event_id
  where s.token = p_token
$$;
grant execute on function public.get_share_session(text) to anon, authenticated;

------------------------------------------------------------------------------
-- public counter
------------------------------------------------------------------------------
create or replace function public.connections_count()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from buddy_requests where status = 'accepted'
$$;
grant execute on function public.connections_count() to anon, authenticated;

------------------------------------------------------------------------------
-- the whole events feed in one round trip (security invoker: RLS applies as the caller)
------------------------------------------------------------------------------
create or replace function public.get_feed(p_lat double precision, p_lng double precision, p_radius double precision default 0.27)
returns jsonb language sql stable set search_path = public as $$
  with ev as (
    select e.id, e.title, e.starts_at, e.ends_at, e.timezone, e.location, e.luma_url,
           e.description_raw, e.summary_en, e.summary_th, e.summary_zh, e.language, e.facts
    from events e
    where e.lat between p_lat - p_radius and p_lat + p_radius
      and e.lng between p_lng - p_radius / greatest(cos(radians(p_lat)), 0.1)
                    and p_lng + p_radius / greatest(cos(radians(p_lat)), 0.1)
      and e.starts_at >= now() - interval '3 hours'
    order by e.starts_at
    limit 50
  ),
  req as (
    select b.id, b.event_id, b.from_id, b.to_id, b.note, b.status, b.icebreakers,
           jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
             'timezone', e.timezone, 'location', e.location, 'luma_url', e.luma_url) as events
    from buddy_requests b join events e on e.id = b.event_id
  ),
  att as (select a.event_id, a.user_id, a.note from attendances a where a.event_id in (select id from ev)),
  peers as (select user_id as id from att union select from_id from req union select to_id from req)
  select jsonb_build_object(
    'events', coalesce((select jsonb_agg(to_jsonb(ev) order by ev.starts_at) from ev), '[]'),
    'attendances', coalesce((select jsonb_agg(to_jsonb(att)) from att), '[]'),
    'requests', coalesce((select jsonb_agg(to_jsonb(req)) from req), '[]'),
    'people', coalesce((select jsonb_object_agg(p.id, jsonb_build_object('id', p.id, 'display_name', p.display_name,
                 'interests', p.interests, 'languages', p.languages))
               from profiles p where p.id in (select id from peers)), '{}'),
    'ratings', coalesce((select jsonb_object_agg(r.reviewee_id, jsonb_build_object('avg', r.avg, 'count', r.n))
               from (select reviewee_id, avg(stars)::float as avg, count(*) as n from reviews
                     where reviewee_id in (select id from peers) group by reviewee_id) r), '{}'),
    'reviews', coalesce((select jsonb_agg(to_jsonb(rv)) from reviews rv where rv.buddy_request_id in (select id from req)), '[]'),
    'contacts', coalesce((select jsonb_object_agg(c.user_id, c.line_id) from contacts c), '{}'),
    'count', connections_count(),
    'me', (select jsonb_build_object('languages', p.languages) from profiles p where p.id = auth.uid())
  )
$$;
grant execute on function public.get_feed(double precision, double precision, double precision) to authenticated;

------------------------------------------------------------------------------
-- realtime for the live feed
------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.attendances, public.buddy_requests;
  end if;
end $$;
