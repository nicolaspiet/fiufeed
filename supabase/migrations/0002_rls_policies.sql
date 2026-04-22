-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.whistles enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_entries enable row level security;
alter table public.competition_votes enable row level security;

-- ── PROFILES ──
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ── FOLLOWS ──
create policy "Follows are publicly readable"
  on public.follows for select using (true);

create policy "Users can follow others"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- ── GROUPS ──
create policy "Public groups are readable by all"
  on public.groups for select
  using (not is_private or id in (
    select group_id from public.group_members where user_id = auth.uid()
  ));

create policy "Authenticated users can create groups"
  on public.groups for insert with check (auth.uid() = owner_id);

create policy "Group owners/admins can update group"
  on public.groups for update using (
    id in (select group_id from public.group_members where user_id = auth.uid() and role in ('owner', 'admin'))
  );

create policy "Group owners can delete group"
  on public.groups for delete using (owner_id = auth.uid());

-- ── GROUP MEMBERS ──
create policy "Group members are visible to members"
  on public.group_members for select using (
    group_id in (select group_id from public.group_members gm where gm.user_id = auth.uid())
    or group_id in (select id from public.groups where not is_private)
  );

create policy "Users can join public groups"
  on public.group_members for insert with check (
    auth.uid() = user_id
    and group_id in (select id from public.groups where not is_private)
  );

create policy "Admins can add members to private groups"
  on public.group_members for insert with check (
    group_id in (select group_id from public.group_members where user_id = auth.uid() and role in ('owner', 'admin'))
  );

create policy "Users can leave groups"
  on public.group_members for delete using (auth.uid() = user_id);

create policy "Admins can remove members"
  on public.group_members for delete using (
    group_id in (select group_id from public.group_members where user_id = auth.uid() and role in ('owner', 'admin'))
  );

-- ── WHISTLES ──
create policy "Public whistles readable by all"
  on public.whistles for select using (
    group_id is null
    or group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Authenticated users can post whistles"
  on public.whistles for insert with check (
    auth.uid() = user_id
    and (
      group_id is null
      or group_id in (select group_id from public.group_members where user_id = auth.uid())
    )
  );

create policy "Users can delete own whistles"
  on public.whistles for delete using (auth.uid() = user_id);

-- ── LIKES ──
create policy "Likes are publicly readable"
  on public.likes for select using (true);

create policy "Authenticated users can like"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.likes for delete using (auth.uid() = user_id);

-- ── COMMENTS ──
create policy "Comments are publicly readable"
  on public.comments for select using (true);

create policy "Authenticated users can comment"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- ── COMPETITIONS ──
create policy "Public competitions readable by all"
  on public.competitions for select using (
    group_id is null
    or group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Admins/owners can create competitions"
  on public.competitions for insert with check (
    auth.uid() = created_by
    and (
      group_id is null
      or group_id in (select group_id from public.group_members where user_id = auth.uid() and role in ('owner', 'admin'))
    )
  );

-- ── COMPETITION ENTRIES ──
create policy "Entries readable during voting/results"
  on public.competition_entries for select using (
    competition_id in (select id from public.competitions where submission_ends_at < now())
  );

create policy "Users can submit entries during submission window"
  on public.competition_entries for insert with check (
    auth.uid() = user_id
    and competition_id in (select id from public.competitions where submission_ends_at > now())
  );

-- ── COMPETITION VOTES ──
create policy "Votes readable by all"
  on public.competition_votes for select using (true);

create policy "Users can vote during voting window"
  on public.competition_votes for insert with check (
    auth.uid() = user_id
    and competition_id in (
      select id from public.competitions
      where submission_ends_at < now() and voting_ends_at > now()
    )
  );
