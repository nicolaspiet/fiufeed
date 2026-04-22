drop policy "Entries readable during voting/results"
  on public.competition_entries;

create policy "Entries readable during voting results or by owner"
  on public.competition_entries for select using (
    auth.uid() = user_id
    or competition_id in (
      select id from public.competitions
      where submission_ends_at < now()
    )
  );
