create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches on delete cascade,
  reviewer_id uuid not null references public.profiles on delete cascade,
  reviewee_id uuid not null references public.profiles on delete cascade,
  stars int not null check (stars between 1 and 5),
  text text,
  auto_no_show boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, reviewer_id)
);

alter table public.reviews enable row level security;

create policy "auth read reviews" on public.reviews for select to authenticated using (true);

create policy "participants review each other" on public.reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.matches m
      join public.offers o on o.id = m.offer_id
      where m.id = match_id
        and (
          (m.local_id = auth.uid() and reviewee_id = o.foreigner_id)
          or (o.foreigner_id = auth.uid() and reviewee_id = m.local_id)
        )
    )
  );
