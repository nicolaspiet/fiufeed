create or replace function public.create_competition_entry_with_whistle(
  p_competition_id uuid,
  p_audio_url text,
  p_duration_s int,
  p_caption text default '',
  p_group_id uuid default null
)
returns table (
  id uuid,
  public_id text,
  audio_url text,
  duration_s int,
  caption text,
  group_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  competition_row public.competitions%rowtype;
  created_whistle public.whistles%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select *
  into competition_row
  from public.competitions c
  where c.id = p_competition_id
    and public.can_see_competition(c.id);

  if competition_row.id is null then
    raise exception 'competition not found or not visible';
  end if;

  if competition_row.submission_ends_at <= now() then
    raise exception 'competition submission window is closed';
  end if;

  if exists (
    select 1
    from public.competition_entries ce
    where ce.competition_id = p_competition_id
      and ce.user_id = current_user_id
  ) then
    raise exception 'user already has an entry in this competition';
  end if;

  if competition_row.group_id is distinct from p_group_id then
    raise exception 'whistle scope must match competition scope';
  end if;

  insert into public.whistles (
    user_id,
    audio_url,
    duration_s,
    caption,
    group_id
  )
  values (
    current_user_id,
    p_audio_url,
    p_duration_s,
    trim(coalesce(p_caption, '')),
    p_group_id
  )
  returning *
  into created_whistle;

  insert into public.competition_entries (
    competition_id,
    user_id,
    whistle_id
  )
  values (
    p_competition_id,
    current_user_id,
    created_whistle.id
  );

  return query
  select
    created_whistle.id,
    created_whistle.public_id,
    created_whistle.audio_url,
    created_whistle.duration_s,
    created_whistle.caption,
    created_whistle.group_id;
end;
$$;
