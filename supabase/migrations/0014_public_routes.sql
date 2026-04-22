create extension if not exists unaccent;

create or replace function public.slugify_text(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.generate_short_public_id()
returns text
language sql
volatile
as $$
  select substring(replace(uuid_generate_v4()::text, '-', '') from 1 for 10);
$$;

alter table public.whistles add column if not exists public_id text;
alter table public.competitions add column if not exists public_id text;
alter table public.competitions add column if not exists slug text;
alter table public.groups add column if not exists slug text;

update public.whistles
set public_id = public.generate_short_public_id()
where public_id is null;

update public.competitions
set
  public_id = coalesce(public_id, public.generate_short_public_id()),
  slug = coalesce(nullif(slug, ''), nullif(public.slugify_text(title), ''), 'competicao')
where public_id is null
   or slug is null
   or slug = '';

with group_bases as (
  select
    id,
    coalesce(nullif(public.slugify_text(name), ''), 'grupo') as base_slug,
    row_number() over (
      partition by coalesce(nullif(public.slugify_text(name), ''), 'grupo')
      order by created_at, id
    ) as slug_rank
  from public.groups
)
update public.groups as groups
set slug = case
  when group_bases.slug_rank = 1 then group_bases.base_slug
  else group_bases.base_slug || '-' || group_bases.slug_rank
end
from group_bases
where groups.id = group_bases.id
  and (groups.slug is null or groups.slug = '');

alter table public.whistles alter column public_id set not null;
alter table public.competitions alter column public_id set not null;
alter table public.competitions alter column slug set not null;
alter table public.groups alter column slug set not null;

create unique index if not exists whistles_public_id_key on public.whistles(public_id);
create unique index if not exists competitions_public_id_key on public.competitions(public_id);
create unique index if not exists groups_slug_key on public.groups(slug);

create or replace function public.build_unique_group_slug(base_value text, current_group_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_base text := coalesce(nullif(public.slugify_text(base_value), ''), 'grupo');
  candidate text := normalized_base;
  counter integer := 2;
begin
  while exists (
    select 1
    from public.groups
    where slug = candidate
      and (current_group_id is null or id <> current_group_id)
  ) loop
    candidate := normalized_base || '-' || counter::text;
    counter := counter + 1;
  end loop;

  return candidate;
end;
$$;

create or replace function public.handle_public_route_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'whistles' then
    if new.public_id is null or new.public_id = '' then
      new.public_id := public.generate_short_public_id();
    end if;
    return new;
  end if;

  if tg_table_name = 'competitions' then
    if new.public_id is null or new.public_id = '' then
      new.public_id := public.generate_short_public_id();
    end if;

    if tg_op = 'INSERT' or new.title is distinct from old.title or new.slug is null or new.slug = '' then
      new.slug := coalesce(nullif(public.slugify_text(new.title), ''), 'competicao');
    end if;

    return new;
  end if;

  if tg_table_name = 'groups' then
    if tg_op = 'INSERT' or new.name is distinct from old.name or new.slug is null or new.slug = '' then
      new.slug := public.build_unique_group_slug(new.name, new.id);
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists set_whistle_public_route_fields on public.whistles;
create trigger set_whistle_public_route_fields
before insert on public.whistles
for each row execute procedure public.handle_public_route_fields();

drop trigger if exists set_competition_public_route_fields on public.competitions;
create trigger set_competition_public_route_fields
before insert or update on public.competitions
for each row execute procedure public.handle_public_route_fields();

drop trigger if exists set_group_public_route_fields on public.groups;
create trigger set_group_public_route_fields
before insert or update on public.groups
for each row execute procedure public.handle_public_route_fields();

drop function if exists public.get_feed(uuid, integer, integer);

create or replace function public.get_feed(p_user_id uuid, p_limit int default 60, p_offset int default 0)
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
      (w.likes_count * 1.7 + w.comments_count * 2.1 + 8.0)
        / (extract(epoch from (now() - w.created_at)) / 3600 + 2) as score,
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
      and w.created_at > now() - interval '14 days'
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
      (w.likes_count * 1.7 + w.comments_count * 2.1 + 6.0)
        / (extract(epoch from (now() - w.created_at)) / 3600 + 2) as score,
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
      and w.created_at > now() - interval '10 days'
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
      (original.likes_count * 1.4 + original.comments_count * 1.8 + 5.0)
        / (extract(epoch from (now() - r.created_at)) / 3600 + 2) as score,
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
      and r.created_at > now() - interval '10 days'
  ),
  trending_whistles as (
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
      (w.likes_count * 2.0 + w.comments_count * 2.2 + 2.0)
        / (extract(epoch from (now() - w.created_at)) / 3600 + 2) as score,
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
    where w.group_id is null
      and w.user_id <> p_user_id
      and not exists (
        select 1 from competition_whistles cw where cw.whistle_id = w.id
      )
      and w.created_at > now() - interval '5 days'
    order by (w.likes_count * 2.0 + w.comments_count * 2.2)
      / (extract(epoch from (now() - w.created_at)) / 3600 + 2) desc
    limit 30
  ),
  combined as (
    select * from own_whistles
    union all
    select * from followed_whistles
    union all
    select * from followed_reposts
    union all
    select * from trending_whistles
  )
  select *
  from combined
  order by score desc, created_at desc
  limit p_limit offset p_offset;
$$;
