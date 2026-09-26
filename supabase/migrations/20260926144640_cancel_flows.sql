create policy "foreigner deletes own offer" on public.offers for delete to authenticated
  using (foreigner_id = auth.uid());

create policy "participants delete match" on public.matches for delete to authenticated
  using (
    local_id = auth.uid()
    or exists (select 1 from public.offers o where o.id = offer_id and o.foreigner_id = auth.uid())
  );

create or replace function public.reopen_offer_on_unmatch()
returns trigger language plpgsql security definer as $$
begin
  update public.offers set status = 'open' where id = old.offer_id;
  return old;
end $$;

create trigger on_match_deleted
  after delete on public.matches
  for each row execute function public.reopen_offer_on_unmatch();
