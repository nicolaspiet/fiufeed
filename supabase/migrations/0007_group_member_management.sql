drop policy "Users can join public groups"
  on public.group_members;

drop policy "Admins can add members to private groups"
  on public.group_members;

create policy "Users can join public groups as members"
  on public.group_members for insert with check (
    auth.uid() = user_id
    and role = 'member'
    and group_id in (select id from public.groups where not is_private)
  );

create policy "Admins can add members"
  on public.group_members for insert with check (
    role = 'member'
    and group_id in (
      select group_id from public.group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create or replace function public.set_group_member_role(
  p_group_id uuid,
  p_target_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
begin
  if v_actor_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Invalid role';
  end if;

  select role into v_actor_role
  from public.group_members
  where group_id = p_group_id and user_id = v_actor_id;

  if v_actor_role not in ('owner', 'admin') then
    raise exception 'You cannot manage members in this group';
  end if;

  select role into v_target_role
  from public.group_members
  where group_id = p_group_id and user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Member not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Owner role cannot be changed';
  end if;

  if v_actor_role = 'admin' and v_target_role <> 'member' then
    raise exception 'Admins can only manage members';
  end if;

  if v_actor_role = 'admin' and p_role <> 'member' then
    raise exception 'Only owners can promote admins';
  end if;

  update public.group_members
  set role = p_role
  where group_id = p_group_id and user_id = p_target_user_id;
end;
$$;

create or replace function public.remove_group_member(
  p_group_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
begin
  if v_actor_id is null then
    raise exception 'Unauthorized';
  end if;

  select role into v_actor_role
  from public.group_members
  where group_id = p_group_id and user_id = v_actor_id;

  if v_actor_role not in ('owner', 'admin') then
    raise exception 'You cannot manage members in this group';
  end if;

  select role into v_target_role
  from public.group_members
  where group_id = p_group_id and user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Member not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Owner cannot be removed';
  end if;

  if v_actor_role = 'admin' and v_target_role <> 'member' then
    raise exception 'Admins can only remove members';
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = p_target_user_id;
end;
$$;

grant execute on function public.set_group_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
