alter table public.profiles
  add column if not exists is_site_admin boolean not null default false;

drop policy "Admins/owners can create competitions"
  on public.competitions;

create policy "Site admins or group owners/admins can create competitions"
  on public.competitions for insert with check (
    auth.uid() = created_by
    and (
      (
        group_id is null
        and exists (
          select 1
          from public.profiles
          where id = auth.uid() and is_site_admin = true
        )
      )
      or (
        group_id in (
          select group_id
          from public.group_members
          where user_id = auth.uid() and role in ('owner', 'admin')
        )
      )
    )
  );
