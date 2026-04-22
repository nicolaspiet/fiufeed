-- ─────────────────────────────────────────────
-- P0-A: Fix interaction RLS to respect parent whistle/competition visibility
-- P0-B: Make audio-whistles bucket private
-- ─────────────────────────────────────────────

-- Helper: returns true if the calling user can see the given whistle
create or replace function public.can_see_whistle(p_whistle_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.whistles w
    where w.id = p_whistle_id
      and (
        w.group_id is null
        or w.group_id in (
          select group_id from public.group_members where user_id = auth.uid()
        )
      )
  );
$$;

-- Helper: returns true if the calling user can see the given competition
create or replace function public.can_see_competition(p_competition_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.competitions c
    where c.id = p_competition_id
      and (
        c.group_id is null
        or c.group_id in (
          select group_id from public.group_members where user_id = auth.uid()
        )
      )
  );
$$;

-- ── LIKES ──
drop policy "Likes are publicly readable"   on public.likes;
drop policy "Authenticated users can like"  on public.likes;

create policy "Likes readable if parent whistle is visible"
  on public.likes for select using (
    public.can_see_whistle(whistle_id)
  );

create policy "Users can like visible whistles"
  on public.likes for insert with check (
    auth.uid() = user_id
    and public.can_see_whistle(whistle_id)
  );

-- ── COMMENTS ──
drop policy "Comments are publicly readable"  on public.comments;
drop policy "Authenticated users can comment" on public.comments;

create policy "Comments readable if parent whistle is visible"
  on public.comments for select using (
    public.can_see_whistle(whistle_id)
  );

create policy "Users can comment on visible whistles"
  on public.comments for insert with check (
    auth.uid() = user_id
    and public.can_see_whistle(whistle_id)
  );

-- ── COMPETITION ENTRIES ──
drop policy "Entries readable during voting results or by owner" on public.competition_entries;
drop policy "Users can submit entries during submission window"  on public.competition_entries;

create policy "Entries readable if competition visible and past submission"
  on public.competition_entries for select using (
    public.can_see_competition(competition_id)
    and (
      auth.uid() = user_id
      or competition_id in (
        select id from public.competitions where submission_ends_at < now()
      )
    )
  );

create policy "Users can submit to visible competitions in window"
  on public.competition_entries for insert with check (
    auth.uid() = user_id
    and public.can_see_competition(competition_id)
    and competition_id in (
      select id from public.competitions where submission_ends_at > now()
    )
  );

-- ── COMPETITION VOTES ──
drop policy "Votes readable by all"               on public.competition_votes;
drop policy "Users can vote during voting window"  on public.competition_votes;

create policy "Votes readable if competition visible"
  on public.competition_votes for select using (
    public.can_see_competition(competition_id)
  );

create policy "Users can vote in visible competitions in window"
  on public.competition_votes for insert with check (
    auth.uid() = user_id
    and public.can_see_competition(competition_id)
    and competition_id in (
      select id from public.competitions
      where submission_ends_at < now() and voting_ends_at > now()
    )
  );

-- ─────────────────────────────────────────────
-- P0-B: Make audio-whistles bucket private
-- Signed URLs must be generated server-side after checking whistle RLS.
-- ─────────────────────────────────────────────

update storage.buckets set public = false where id = 'audio-whistles';

drop policy "Public audio read" on storage.objects;

-- Only authenticated users can read audio; the app layer gates access via
-- server-side signed URL generation after verifying whistle visibility via RLS.
create policy "Authenticated users can read audio"
  on storage.objects for select using (
    bucket_id = 'audio-whistles'
    and auth.uid() is not null
  );
