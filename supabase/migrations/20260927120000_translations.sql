-- Translation cache for text people write (notes, hello messages, bios), shown in the reader's language.
-- Written only by the server (service role); keyed by a hash of the source text.
create table public.translations (
  hash text not null,
  lang text not null check (lang in ('en', 'th', 'zh')),
  text text not null,
  created_at timestamptz not null default now(),
  primary key (hash, lang)
);
alter table public.translations enable row level security;

-- get_feed: also return attendance ids (to translate notes) and bios.
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
