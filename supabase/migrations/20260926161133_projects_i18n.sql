alter table public.profiles
  add column language text not null default 'en' check (language in ('en', 'th', 'zh'));

alter table public.events add column description_zh text;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  title text not null,
  description text,
  looking_for text,
  description_th text,
  description_zh text,
  category text not null default 'build' check (category in ('social', 'build', 'local_life')),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table public.project_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  requester_id uuid not null references public.profiles on delete cascade,
  mission text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (project_id, requester_id)
);

alter table public.projects enable row level security;
alter table public.project_requests enable row level security;

create policy "auth read projects" on public.projects for select to authenticated using (true);
create policy "owner creates project" on public.projects for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner updates project" on public.projects for update to authenticated
  using (owner_id = auth.uid());

create policy "involved read requests" on public.project_requests for select to authenticated
  using (
    requester_id = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );
create policy "requester creates request" on public.project_requests for insert to authenticated
  with check (requester_id = auth.uid());
create policy "owner updates request" on public.project_requests for update to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "requester deletes request" on public.project_requests for delete to authenticated
  using (requester_id = auth.uid());

create policy "users update own language" on public.profiles for update to authenticated
  using (id = auth.uid());
