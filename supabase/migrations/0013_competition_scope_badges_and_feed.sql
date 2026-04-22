alter table public.competitions
  add column if not exists title_base text;

update public.competitions
set title_base = coalesce(nullif(title_base, ''), title)
where title_base is null or title_base = '';

alter table public.competitions
  alter column title_base set not null;

create table if not exists public.competition_comments (
  id uuid primary key default uuid_generate_v4(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  entry_id uuid not null references public.competition_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(content) > 0 and length(content) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  label text not null default 'Bird Badge',
  icon text not null default 'bird',
  created_at timestamptz not null default now(),
  unique (user_id, competition_id)
);

create table if not exists public.user_titles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  tier text not null check (tier in ('gold', 'silver', 'bronze')),
  title text not null,
  created_at timestamptz not null default now(),
  unique (user_id, competition_id)
);

alter table public.profiles
  add column if not exists equipped_badge_id uuid references public.user_badges(id) on delete set null,
  add column if not exists equipped_title_id uuid references public.user_titles(id) on delete set null;

alter table public.competition_comments enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_titles enable row level security;

create or replace function public.is_competition_participant(
  p_competition_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.competition_entries ce
    where ce.competition_id = p_competition_id
      and ce.user_id = p_user_id
  );
$$;

create or replace function public.can_see_whistle(p_whistle_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.whistles w
    left join public.competition_entries ce on ce.whistle_id = w.id
    left join public.competitions c on c.id = ce.competition_id
    where w.id = p_whistle_id
      and (
        (
          ce.id is null
          and (
            w.group_id is null
            or w.group_id in (
              select group_id
              from public.group_members
              where user_id = auth.uid()
            )
          )
        )
        or (
          ce.id is not null
          and public.can_see_competition(c.id)
          and (
            auth.uid() = w.user_id
            or (
              public.is_competition_participant(c.id, auth.uid())
              and c.submission_ends_at <= now()
            )
          )
        )
      )
  );
$$;

create or replace function public.validate_profile_equipment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.equipped_badge_id is not null and not exists (
    select 1
    from public.user_badges ub
    where ub.id = new.equipped_badge_id
      and ub.user_id = new.id
  ) then
    raise exception 'equipped badge does not belong to this profile';
  end if;

  if new.equipped_title_id is not null and not exists (
    select 1
    from public.user_titles ut
    where ut.id = new.equipped_title_id
      and ut.user_id = new.id
  ) then
    raise exception 'equipped title does not belong to this profile';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_profile_equipment_before_write on public.profiles;

create trigger validate_profile_equipment_before_write
  before update on public.profiles
  for each row execute procedure public.validate_profile_equipment();

create or replace function public.competition_title_for_place(p_title_base text, p_place int)
returns text
language sql
immutable
as $$
  select case p_place
    when 1 then 'Ouro ' || p_title_base
    when 2 then 'Prata ' || p_title_base
    when 3 then 'Bronze ' || p_title_base
    else p_title_base
  end;
$$;

create or replace function public.get_competition_whistle_ids()
returns table (whistle_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select distinct ce.whistle_id
  from public.competition_entries ce;
$$;

create or replace function public.settle_competition_rewards(p_competition_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  competition_row public.competitions%rowtype;
  reward_row record;
begin
  select *
  into competition_row
  from public.competitions
  where id = p_competition_id;

  if competition_row.id is null then
    return;
  end if;

  if competition_row.voting_ends_at > now() then
    return;
  end if;

  for reward_row in
    select
      ce.user_id,
      row_number() over (
        order by ce.votes_count desc, ce.created_at asc, ce.id asc
      ) as place
    from public.competition_entries ce
    where ce.competition_id = p_competition_id
    order by ce.votes_count desc, ce.created_at asc, ce.id asc
    limit 3
  loop
    if reward_row.place = 1 then
      insert into public.user_badges (user_id, competition_id, label, icon)
      values (reward_row.user_id, p_competition_id, 'Bird Badge', 'bird')
      on conflict (user_id, competition_id) do nothing;
    end if;

    insert into public.user_titles (user_id, competition_id, tier, title)
    values (
      reward_row.user_id,
      p_competition_id,
      case reward_row.place
        when 1 then 'gold'
        when 2 then 'silver'
        else 'bronze'
      end,
      public.competition_title_for_place(competition_row.title_base, reward_row.place)
    )
    on conflict (user_id, competition_id) do nothing;
  end loop;
end;
$$;

drop policy "Public whistles readable by all" on public.whistles;

create policy "Visible whistles readable by scope"
  on public.whistles for select using (
    public.can_see_whistle(id)
  );

drop policy "Entries readable if competition visible and past submission" on public.competition_entries;

create policy "Competition entries readable in participant scopes"
  on public.competition_entries for select using (
    public.can_see_competition(competition_id)
    and (
      auth.uid() = user_id
      or (
        public.is_competition_participant(competition_id, auth.uid())
        and competition_id in (
          select id
          from public.competitions
          where submission_ends_at <= now()
        )
      )
    )
  );

drop policy "Votes readable if competition visible" on public.competition_votes;
drop policy "Users can vote once on valid visible entries in visible competitions" on public.competition_votes;

create policy "Competition votes readable by participants"
  on public.competition_votes for select using (
    public.can_see_competition(competition_id)
    and public.is_competition_participant(competition_id, auth.uid())
  );

create policy "Participants can vote once on valid competition entries"
  on public.competition_votes for insert with check (
    auth.uid() = user_id
    and public.can_see_competition(competition_id)
    and public.is_competition_participant(competition_id, auth.uid())
    and competition_id in (
      select id
      from public.competitions
      where submission_ends_at <= now()
        and voting_ends_at > now()
    )
    and exists (
      select 1
      from public.competition_entries e
      where e.id = entry_id
        and e.competition_id = competition_id
        and e.user_id <> auth.uid()
    )
  );

create policy "Competition comments readable by participants"
  on public.competition_comments for select using (
    public.can_see_competition(competition_id)
    and public.is_competition_participant(competition_id, auth.uid())
    and competition_id in (
      select id
      from public.competitions
      where submission_ends_at <= now()
    )
  );

create policy "Participants can comment on visible competition entries"
  on public.competition_comments for insert with check (
    auth.uid() = user_id
    and public.can_see_competition(competition_id)
    and public.is_competition_participant(competition_id, auth.uid())
    and competition_id in (
      select id
      from public.competitions
      where submission_ends_at <= now()
    )
    and exists (
      select 1
      from public.competition_entries e
      where e.id = entry_id
        and e.competition_id = competition_id
    )
  );

create policy "Users can delete own competition comments"
  on public.competition_comments for delete using (auth.uid() = user_id);

create policy "Badge inventory is publicly readable"
  on public.user_badges for select using (true);

create policy "Title inventory is publicly readable"
  on public.user_titles for select using (true);

drop function if exists public.get_feed(uuid, integer, integer);

create or replace function public.get_feed(p_user_id uuid, p_limit int default 60, p_offset int default 0)
returns table (
  item_type text,
  item_id uuid,
  original_whistle_id uuid,
  actor_user_id uuid,
  audio_url text,
  duration_s int,
  caption text,
  likes_count int,
  comments_count int,
  group_id uuid,
  created_at timestamptz,
  score float8,
  username text,
  display_name text,
  avatar_url text,
  equipped_badge_label text,
  equipped_title text,
  original_user_id uuid,
  original_username text,
  original_display_name text,
  original_avatar_url text
) language sql security definer set search_path = public as $$
  with followed_users as (
    select following_id
    from public.follows
    where follower_id = p_user_id
  ),
  eligible_whistles as (
    select w.*
    from public.whistles w
    where w.group_id is null
      and not exists (
        select 1
        from public.competition_entries ce
        where ce.whistle_id = w.id
      )
  ),
  own_whistles as (
    select
      'whistle'::text as item_type,
      w.id as item_id,
      w.id as original_whistle_id,
      w.user_id as actor_user_id,
      w.audio_url,
      w.duration_s,
      w.caption,
      w.likes_count,
      w.comments_count,
      w.group_id,
      w.created_at,
      (
        5.0
        + w.likes_count * 1.6
        + w.comments_count * 1.9
      ) / (extract(epoch from (now() - w.created_at)) / 3600 + 3) as score,
      actor.username,
      actor.display_name,
      actor.avatar_url,
      badge.label as equipped_badge_label,
      title.title as equipped_title,
      w.user_id as original_user_id,
      actor.username as original_username,
      actor.display_name as original_display_name,
      actor.avatar_url as original_avatar_url
    from eligible_whistles w
    join public.profiles actor on actor.id = w.user_id
    left join public.user_badges badge on badge.id = actor.equipped_badge_id
    left join public.user_titles title on title.id = actor.equipped_title_id
    where w.user_id = p_user_id
      and w.created_at > now() - interval '14 days'
  ),
  followed_whistles as (
    select
      'whistle'::text as item_type,
      w.id as item_id,
      w.id as original_whistle_id,
      w.user_id as actor_user_id,
      w.audio_url,
      w.duration_s,
      w.caption,
      w.likes_count,
      w.comments_count,
      w.group_id,
      w.created_at,
      (
        4.0
        + w.likes_count * 1.5
        + w.comments_count * 2.0
      ) / (extract(epoch from (now() - w.created_at)) / 3600 + 2.5) as score,
      actor.username,
      actor.display_name,
      actor.avatar_url,
      badge.label as equipped_badge_label,
      title.title as equipped_title,
      w.user_id as original_user_id,
      actor.username as original_username,
      actor.display_name as original_display_name,
      actor.avatar_url as original_avatar_url
    from eligible_whistles w
    join public.profiles actor on actor.id = w.user_id
    left join public.user_badges badge on badge.id = actor.equipped_badge_id
    left join public.user_titles title on title.id = actor.equipped_title_id
    where w.user_id in (select following_id from followed_users)
      and w.created_at > now() - interval '10 days'
  ),
  followed_reposts as (
    select
      'repost'::text as item_type,
      r.id as item_id,
      w.id as original_whistle_id,
      r.user_id as actor_user_id,
      w.audio_url,
      w.duration_s,
      w.caption,
      w.likes_count,
      w.comments_count,
      r.group_id,
      r.created_at,
      (
        2.0
        + w.likes_count * 1.1
        + w.comments_count * 1.3
      ) / (extract(epoch from (now() - r.created_at)) / 3600 + 2.8) as score,
      reposter.username,
      reposter.display_name,
      reposter.avatar_url,
      reposter_badge.label as equipped_badge_label,
      reposter_title.title as equipped_title,
      original_author.id as original_user_id,
      original_author.username as original_username,
      original_author.display_name as original_display_name,
      original_author.avatar_url as original_avatar_url
    from public.reposts r
    join eligible_whistles w on w.id = r.original_whistle_id
    join public.profiles reposter on reposter.id = r.user_id
    join public.profiles original_author on original_author.id = w.user_id
    left join public.user_badges reposter_badge on reposter_badge.id = reposter.equipped_badge_id
    left join public.user_titles reposter_title on reposter_title.id = reposter.equipped_title_id
    where r.user_id in (select following_id from followed_users)
      and r.group_id is null
      and r.created_at > now() - interval '10 days'
  ),
  trending_whistles as (
    select
      'whistle'::text as item_type,
      w.id as item_id,
      w.id as original_whistle_id,
      w.user_id as actor_user_id,
      w.audio_url,
      w.duration_s,
      w.caption,
      w.likes_count,
      w.comments_count,
      w.group_id,
      w.created_at,
      (
        1.5
        + w.likes_count * 1.7
        + w.comments_count * 1.8
      ) / (extract(epoch from (now() - w.created_at)) / 3600 + 1.8) as score,
      actor.username,
      actor.display_name,
      actor.avatar_url,
      badge.label as equipped_badge_label,
      title.title as equipped_title,
      w.user_id as original_user_id,
      actor.username as original_username,
      actor.display_name as original_display_name,
      actor.avatar_url as original_avatar_url
    from eligible_whistles w
    join public.profiles actor on actor.id = w.user_id
    left join public.user_badges badge on badge.id = actor.equipped_badge_id
    left join public.user_titles title on title.id = actor.equipped_title_id
    where w.user_id <> p_user_id
      and w.created_at > now() - interval '4 days'
    order by score desc
    limit greatest(p_limit * 2, 40)
  )
  select *
  from (
    select * from own_whistles
    union all
    select * from followed_whistles
    union all
    select * from followed_reposts
    union all
    select * from trending_whistles
  ) combined
  order by score desc, created_at desc
  limit p_limit offset p_offset;
$$;
