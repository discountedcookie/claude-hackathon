-- Fixes from the pre-demo bug hunt.

-- Follow-up drafts survive a reload: { <user_id>: { message_in_their_language, message_in_my_language } }.
alter table public.buddy_requests add column followups jsonb;

-- One-message onboarding: the parsed profile waits here until the person confirms it.
alter table public.onboarding_sessions add column draft jsonb;

-- People can set and change their own LINE ID.
create policy "own contact insert" on public.contacts for insert to authenticated with check (user_id = auth.uid());
create policy "own contact update" on public.contacts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant insert (user_id, line_id), update (line_id) on public.contacts to authenticated;

-- Accepted project members can see the rest of the team (and, through the contacts policy, their LINE IDs).
-- A security-definer check avoids a policy on project_requests that reads project_requests (infinite recursion).
create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from project_requests
    where project_id = p_project_id and requester_id = auth.uid() and status = 'accepted'
  )
$$;
grant execute on function public.is_project_member(uuid) to authenticated;
create policy "team read accepted requests" on public.project_requests for select to authenticated
  using (status = 'accepted' and public.is_project_member(project_id));

-- Un-marking "I'm going" also cancels your requests and plans for that event.
create or replace function public.drop_requests_on_ungoing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from buddy_requests
  where event_id = old.event_id and (from_id = old.user_id or to_id = old.user_id);
  return old;
end $$;
create trigger on_attendance_deleted
  after delete on public.attendances
  for each row execute function public.drop_requests_on_ungoing();

-- Live updates on the projects page.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.projects, public.project_requests;
  end if;
end $$;

-- get_feed:
--  * events stay listed until they end (ends_at, or start + 4 h), not 3 h after start
--  * events you're going to are always listed, even outside the area (e.g. added by link)
--  * requests carry follow-up drafts
create or replace function public.get_feed(p_lat double precision, p_lng double precision, p_radius double precision default 0.27)
returns jsonb language sql stable set search_path = public as $$
  with ev as (
    select e.id, e.title, e.starts_at, e.ends_at, e.timezone, e.location, e.luma_url,
           e.description_raw, e.summary_en, e.summary_th, e.summary_zh, e.language, e.facts
    from events e
    where coalesce(e.ends_at, e.starts_at + interval '4 hours') >= now()
      and (
        (e.lat between p_lat - p_radius and p_lat + p_radius
          and e.lng between p_lng - p_radius / greatest(cos(radians(p_lat)), 0.1)
                        and p_lng + p_radius / greatest(cos(radians(p_lat)), 0.1))
        or e.id in (select event_id from attendances where user_id = auth.uid())
      )
    order by e.starts_at
    limit 50
  ),
  req as (
    select b.id, b.event_id, b.from_id, b.to_id, b.note, b.status, b.icebreakers, b.followups,
           jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
             'timezone', e.timezone, 'location', e.location, 'luma_url', e.luma_url) as events
    from buddy_requests b join events e on e.id = b.event_id
  ),
  att as (select a.id, a.event_id, a.user_id, a.note from attendances a where a.event_id in (select id from ev)),
  peers as (select user_id as id from att union select from_id from req union select to_id from req)
  select jsonb_build_object(
    'events', coalesce((select jsonb_agg(to_jsonb(ev) order by ev.starts_at) from ev), '[]'),
    'attendances', coalesce((select jsonb_agg(to_jsonb(att)) from att), '[]'),
    'requests', coalesce((select jsonb_agg(to_jsonb(req)) from req), '[]'),
    'people', coalesce((select jsonb_object_agg(p.id, jsonb_build_object('id', p.id, 'display_name', p.display_name,
                 'interests', p.interests, 'languages', p.languages, 'bio', p.bio))
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

-- Guest (anonymous) sign-in starts onboarding before there's an email: fall back to "Guest" until onboarding names them.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  line text := left(trim(coalesce(meta->>'line_id', '')), 60);
begin
  insert into profiles (id, display_name, language)
  values (
    new.id,
    coalesce(nullif(left(trim(meta->>'display_name'), 60), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Guest'),
    case when meta->>'language' in ('en', 'th', 'zh') then meta->>'language' else 'en' end
  )
  on conflict (id) do nothing;
  if line <> '' then
    insert into contacts (user_id, line_id) values (new.id, line) on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
