-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null default '',
  avatar_url    text,
  banner_url    text,
  bio           text default '',
  created_at    timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  if length(base_username) < 3 then base_username := 'user'; end if;
  final_username := base_username;
  loop
    begin
      insert into public.profiles (id, username, display_name, avatar_url)
      values (
        new.id,
        final_username,
        coalesce(new.raw_user_meta_data->>'full_name', final_username),
        new.raw_user_meta_data->>'avatar_url'
      );
      exit;
    exception when unique_violation then
      counter := counter + 1;
      final_username := base_username || counter::text;
    end;
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- FOLLOWS
-- ─────────────────────────────────────────────
create table public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

-- ─────────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────────
create table public.groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text default '',
  avatar_url  text,
  banner_url  text,
  is_private  boolean not null default false,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id    uuid not null references public.groups(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Auto-add owner as member on group creation
create or replace function public.handle_new_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute procedure public.handle_new_group();

-- ─────────────────────────────────────────────
-- WHISTLES (posts)
-- ─────────────────────────────────────────────
create table public.whistles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  audio_url       text not null,
  duration_s      int not null check (duration_s > 0 and duration_s <= 180),
  caption         text default '',
  likes_count     int not null default 0,
  comments_count  int not null default 0,
  group_id        uuid references public.groups(id) on delete cascade,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- LIKES
-- ─────────────────────────────────────────────
create table public.likes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  whistle_id  uuid not null references public.whistles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, whistle_id)
);

-- Keep likes_count in sync
create or replace function public.handle_like_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.whistles set likes_count = likes_count + 1 where id = new.whistle_id;
  return new;
end;
$$;

create or replace function public.handle_like_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.whistles set likes_count = greatest(likes_count - 1, 0) where id = old.whistle_id;
  return old;
end;
$$;

create trigger on_like_inserted after insert on public.likes for each row execute procedure public.handle_like_insert();
create trigger on_like_deleted after delete on public.likes for each row execute procedure public.handle_like_delete();

-- ─────────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────────
create table public.comments (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  whistle_id  uuid not null references public.whistles(id) on delete cascade,
  content     text not null check (length(content) > 0 and length(content) <= 500),
  created_at  timestamptz not null default now()
);

create or replace function public.handle_comment_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.whistles set comments_count = comments_count + 1 where id = new.whistle_id;
  return new;
end;
$$;

create or replace function public.handle_comment_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.whistles set comments_count = greatest(comments_count - 1, 0) where id = old.whistle_id;
  return old;
end;
$$;

create trigger on_comment_inserted after insert on public.comments for each row execute procedure public.handle_comment_insert();
create trigger on_comment_deleted after delete on public.comments for each row execute procedure public.handle_comment_delete();

-- ─────────────────────────────────────────────
-- COMPETITIONS
-- ─────────────────────────────────────────────
create table public.competitions (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  theme               text not null,
  description         text default '',
  submission_ends_at  timestamptz not null,
  voting_ends_at      timestamptz not null,
  group_id            uuid references public.groups(id) on delete cascade,
  created_by          uuid not null references public.profiles(id) on delete cascade,
  created_at          timestamptz not null default now(),
  constraint voting_after_submission check (voting_ends_at > submission_ends_at)
);

create table public.competition_entries (
  id              uuid primary key default uuid_generate_v4(),
  competition_id  uuid not null references public.competitions(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  whistle_id      uuid not null references public.whistles(id) on delete cascade,
  votes_count     int not null default 0,
  created_at      timestamptz not null default now(),
  unique (competition_id, user_id)
);

create table public.competition_votes (
  competition_id  uuid not null references public.competitions(id) on delete cascade,
  entry_id        uuid not null references public.competition_entries(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (competition_id, user_id)
);

create or replace function public.handle_competition_vote_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.competition_entries set votes_count = votes_count + 1 where id = new.entry_id;
  return new;
end;
$$;

create trigger on_competition_vote_inserted
  after insert on public.competition_votes
  for each row execute procedure public.handle_competition_vote_insert();

-- ─────────────────────────────────────────────
-- ALGORITHMIC FEED RPC
-- ─────────────────────────────────────────────
create or replace function public.get_feed(p_user_id uuid, p_limit int default 20, p_offset int default 0)
returns table (
  id              uuid,
  user_id         uuid,
  audio_url       text,
  duration_s      int,
  caption         text,
  likes_count     int,
  comments_count  int,
  group_id        uuid,
  created_at      timestamptz,
  score           float8,
  username        text,
  display_name    text,
  avatar_url      text
) language sql security definer set search_path = public as $$
  with followed_whistles as (
    select w.*,
      (w.likes_count * 2.0 + w.comments_count * 1.5)
        / (extract(epoch from (now() - w.created_at)) / 3600 + 2) as score
    from public.whistles w
    where w.user_id in (
      select following_id from public.follows where follower_id = p_user_id
    )
    and w.group_id is null
    and w.created_at > now() - interval '7 days'
  ),
  trending_whistles as (
    select w.*,
      (w.likes_count * 2.0 + w.comments_count * 1.5)
        / (extract(epoch from (now() - w.created_at)) / 3600 + 2) as score
    from public.whistles w
    where w.group_id is null
    and w.created_at > now() - interval '3 days'
    and w.user_id <> p_user_id
    order by score desc
    limit 10
  ),
  combined as (
    select * from followed_whistles
    union
    select * from trending_whistles
  )
  select c.id, c.user_id, c.audio_url, c.duration_s, c.caption,
         c.likes_count, c.comments_count, c.group_id, c.created_at, c.score,
         p.username, p.display_name, p.avatar_url
  from combined c
  join public.profiles p on p.id = c.user_id
  order by c.score desc
  limit p_limit offset p_offset;
$$;
