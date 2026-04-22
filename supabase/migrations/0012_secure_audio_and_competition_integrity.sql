drop policy "Authenticated users can read audio" on storage.objects;

create policy "Visible whistle audio can be read"
  on storage.objects for select using (
    bucket_id = 'audio-whistles'
    and exists (
      select 1
      from public.whistles w
      where public.can_see_whistle(w.id)
        and (
          w.audio_url = name
          or split_part(w.audio_url, '/audio-whistles/', 2) = name
        )
    )
  );

drop policy "Users can submit to visible competitions in window" on public.competition_entries;
drop policy "Users can vote in visible competitions in window" on public.competition_votes;

create policy "Users can submit own visible whistle to visible competitions in window"
  on public.competition_entries for insert with check (
    auth.uid() = user_id
    and public.can_see_competition(competition_id)
    and competition_id in (
      select id
      from public.competitions
      where submission_ends_at > now()
    )
    and exists (
      select 1
      from public.whistles w
      join public.competitions c on c.id = competition_id
      where w.id = whistle_id
        and w.user_id = auth.uid()
        and (
          (c.group_id is null and w.group_id is null)
          or c.group_id = w.group_id
        )
        and public.can_see_whistle(w.id)
    )
  );

create policy "Users can vote once on valid visible entries in visible competitions"
  on public.competition_votes for insert with check (
    auth.uid() = user_id
    and public.can_see_competition(competition_id)
    and competition_id in (
      select id
      from public.competitions
      where submission_ends_at < now() and voting_ends_at > now()
    )
    and exists (
      select 1
      from public.competition_entries e
      where e.id = entry_id
        and e.competition_id = competition_id
        and e.user_id <> auth.uid()
    )
  );
