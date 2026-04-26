drop function if exists public.get_feed(uuid, integer, integer);

create or replace function public.get_feed(p_user_id uuid, p_limit int default 20, p_offset int default 0)
returns table (
  item_type text,
  item_id uuid,
  original_whistle_id uuid,
  original_public_id text,
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
)
language sql
security definer
set search_path = public
as $$
  with follower_ids as (
    select following_id
    from public.follows
    where follower_id = p_user_id
  ),
  competition_whistles as (
    select whistle_id
    from public.competition_entries
  ),
  own_whistles as (
    select
      'whistle'::text as item_type,
      w.id as item_id,
      w.id as original_whistle_id,
      w.public_id as original_public_id,
      w.user_id as actor_user_id,
      w.audio_url,
      w.duration_s,
      w.caption,
      w.likes_count,
      w.comments_count,
      w.group_id,
      w.created_at,
      extract(epoch from w.created_at) as score,
      actor.username,
      actor.display_name,
      actor.avatar_url,
      equipped_badge.label as equipped_badge_label,
      equipped_title.title as equipped_title,
      w.user_id as original_user_id,
      actor.username as original_username,
      actor.display_name as original_display_name,
      actor.avatar_url as original_avatar_url
    from public.whistles w
    join public.profiles actor on actor.id = w.user_id
    left join public.user_badges equipped_badge on equipped_badge.id = actor.equipped_badge_id
    left join public.user_titles equipped_title on equipped_title.id = actor.equipped_title_id
    where w.user_id = p_user_id
      and w.group_id is null
      and not exists (
        select 1 from competition_whistles cw where cw.whistle_id = w.id
      )
  ),
  followed_whistles as (
    select
      'whistle'::text as item_type,
      w.id as item_id,
      w.id as original_whistle_id,
      w.public_id as original_public_id,
      w.user_id as actor_user_id,
      w.audio_url,
      w.duration_s,
      w.caption,
      w.likes_count,
      w.comments_count,
      w.group_id,
      w.created_at,
      extract(epoch from w.created_at) as score,
      actor.username,
      actor.display_name,
      actor.avatar_url,
      equipped_badge.label as equipped_badge_label,
      equipped_title.title as equipped_title,
      w.user_id as original_user_id,
      actor.username as original_username,
      actor.display_name as original_display_name,
      actor.avatar_url as original_avatar_url
    from public.whistles w
    join follower_ids followed on followed.following_id = w.user_id
    join public.profiles actor on actor.id = w.user_id
    left join public.user_badges equipped_badge on equipped_badge.id = actor.equipped_badge_id
    left join public.user_titles equipped_title on equipped_title.id = actor.equipped_title_id
    where w.group_id is null
      and not exists (
        select 1 from competition_whistles cw where cw.whistle_id = w.id
      )
  ),
  followed_reposts as (
    select
      'repost'::text as item_type,
      r.id as item_id,
      original.id as original_whistle_id,
      original.public_id as original_public_id,
      r.user_id as actor_user_id,
      original.audio_url,
      original.duration_s,
      original.caption,
      original.likes_count,
      original.comments_count,
      r.group_id,
      r.created_at,
      extract(epoch from r.created_at) as score,
      actor.username,
      actor.display_name,
      actor.avatar_url,
      equipped_badge.label as equipped_badge_label,
      equipped_title.title as equipped_title,
      original.user_id as original_user_id,
      original_author.username as original_username,
      original_author.display_name as original_display_name,
      original_author.avatar_url as original_avatar_url
    from public.reposts r
    join follower_ids followed on followed.following_id = r.user_id
    join public.whistles original on original.id = r.original_whistle_id
    join public.profiles actor on actor.id = r.user_id
    join public.profiles original_author on original_author.id = original.user_id
    left join public.user_badges equipped_badge on equipped_badge.id = actor.equipped_badge_id
    left join public.user_titles equipped_title on equipped_title.id = actor.equipped_title_id
    where r.group_id is null
      and original.group_id is null
      and not exists (
        select 1 from competition_whistles cw where cw.whistle_id = original.id
      )
  ),
  combined as (
    select * from own_whistles
    union all
    select * from followed_whistles
    union all
    select * from followed_reposts
  ),
  deduped as (
    select *,
      row_number() over (
        partition by original_whistle_id
        order by created_at desc, case when item_type = 'whistle' then 0 else 1 end
      ) as row_num
    from combined
  )
  select
    item_type,
    item_id,
    original_whistle_id,
    original_public_id,
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
    equipped_badge_label,
    equipped_title,
    original_user_id,
    original_username,
    original_display_name,
    original_avatar_url
  from deduped
  where row_num = 1
  order by created_at desc
  limit p_limit offset p_offset;
$$;
