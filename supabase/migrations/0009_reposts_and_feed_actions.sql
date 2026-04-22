create table public.reposts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_whistle_id uuid not null references public.whistles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, original_whistle_id)
);

alter table public.reposts enable row level security;

create policy "Reposts are readable in visible scopes"
  on public.reposts for select using (
    group_id is null
    or group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Users can repost visible whistles in the same context"
  on public.reposts for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.whistles w
      where w.id = original_whistle_id
        and (
          (w.group_id is null and group_id is null)
          or w.group_id = group_id
        )
        and (
          w.group_id is null
          or w.group_id in (
            select group_id
            from public.group_members
            where user_id = auth.uid()
          )
        )
    )
  );

create policy "Users can delete own reposts"
  on public.reposts for delete using (auth.uid() = user_id);

drop function if exists public.get_feed(uuid, integer, integer);

create or replace function public.get_feed(p_user_id uuid, p_limit int default 20, p_offset int default 0)
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
      (w.likes_count * 2.0 + w.comments_count * 1.5)
        / (extract(epoch from (now() - w.created_at)) / 3600 + 2) as score,
      actor.username,
      actor.display_name,
      actor.avatar_url,
      w.user_id as original_user_id,
      actor.username as original_username,
      actor.display_name as original_display_name,
      actor.avatar_url as original_avatar_url
    from public.whistles w
    join public.profiles actor on actor.id = w.user_id
    where w.user_id in (select following_id from followed_users)
      and w.group_id is null
      and w.created_at > now() - interval '7 days'
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
      (w.likes_count * 2.0 + w.comments_count * 1.5)
        / (extract(epoch from (now() - r.created_at)) / 3600 + 2) as score,
      reposter.username,
      reposter.display_name,
      reposter.avatar_url,
      original_author.id as original_user_id,
      original_author.username as original_username,
      original_author.display_name as original_display_name,
      original_author.avatar_url as original_avatar_url
    from public.reposts r
    join public.whistles w on w.id = r.original_whistle_id
    join public.profiles reposter on reposter.id = r.user_id
    join public.profiles original_author on original_author.id = w.user_id
    where r.user_id in (select following_id from followed_users)
      and r.group_id is null
      and r.created_at > now() - interval '7 days'
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
      (w.likes_count * 2.0 + w.comments_count * 1.5)
        / (extract(epoch from (now() - w.created_at)) / 3600 + 2) as score,
      actor.username,
      actor.display_name,
      actor.avatar_url,
      w.user_id as original_user_id,
      actor.username as original_username,
      actor.display_name as original_display_name,
      actor.avatar_url as original_avatar_url
    from public.whistles w
    join public.profiles actor on actor.id = w.user_id
    where w.group_id is null
      and w.created_at > now() - interval '3 days'
      and w.user_id <> p_user_id
    order by score desc
    limit 10
  ),
  combined as (
    select * from followed_whistles
    union all
    select * from followed_reposts
    union all
    select * from trending_whistles
  ),
  deduped as (
    select *,
      row_number() over (partition by item_type, item_id order by score desc, created_at desc) as row_num
    from combined
  )
  select
    item_type,
    item_id,
    original_whistle_id,
    actor_user_id,
    audio_url,
    duration_s,
    caption,
    likes_count,
    comments_count,
    group_id,
    created_at,
    score,
    username,
    display_name,
    avatar_url,
    original_user_id,
    original_username,
    original_display_name,
    original_avatar_url
  from deduped
  where row_num = 1
  order by score desc, created_at desc
  limit p_limit offset p_offset;
$$;
