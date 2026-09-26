create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  line_id text,
  role text not null check (role in ('foreigner', 'local')),
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  luma_url text not null unique,
  title text not null,
  starts_at timestamptz,
  location text,
  description_en text,
  description_th text,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  foreigner_id uuid not null references public.profiles on delete cascade,
  status text not null default 'open' check (status in ('open', 'matched')),
  created_at timestamptz not null default now(),
  unique (event_id, foreigner_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.offers on delete cascade,
  local_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.mark_offer_matched()
returns trigger language plpgsql security definer as $$
begin
  update public.offers set status = 'matched' where id = new.offer_id;
  return new;
end $$;

create trigger on_match_created
  after insert on public.matches
  for each row execute function public.mark_offer_matched();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.offers enable row level security;
alter table public.matches enable row level security;

create policy "auth read profiles" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create policy "auth read events" on public.events for select to authenticated using (true);
create policy "auth insert events" on public.events for insert to authenticated with check (true);

create policy "auth read offers" on public.offers for select to authenticated using (true);
create policy "foreigner inserts own offer" on public.offers for insert to authenticated with check (foreigner_id = auth.uid());
-- PoC: matched status set via trigger; locals need update rights to attach
create policy "auth update offers" on public.offers for update to authenticated using (true);

create policy "involved read matches" on public.matches for select to authenticated
  using (local_id = auth.uid() or exists (select 1 from public.offers o where o.id = offer_id and o.foreigner_id = auth.uid()));
create policy "local inserts match" on public.matches for insert to authenticated with check (local_id = auth.uid());
