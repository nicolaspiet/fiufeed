create policy "Public group avatar read"
  on storage.objects for select using (bucket_id = 'group-avatars');

create policy "Public group banner read"
  on storage.objects for select using (bucket_id = 'group-banners');

create policy "Group admins upload avatar"
  on storage.objects for insert with check (
    bucket_id = 'group-avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] in (
      select group_id::text
      from public.group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Group admins upload banner"
  on storage.objects for insert with check (
    bucket_id = 'group-banners'
    and auth.uid() is not null
    and (storage.foldername(name))[1] in (
      select group_id::text
      from public.group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Group admins update avatar"
  on storage.objects for update using (
    bucket_id = 'group-avatars'
    and (storage.foldername(name))[1] in (
      select group_id::text
      from public.group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Group admins update banner"
  on storage.objects for update using (
    bucket_id = 'group-banners'
    and (storage.foldername(name))[1] in (
      select group_id::text
      from public.group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Group admins delete avatar"
  on storage.objects for delete using (
    bucket_id = 'group-avatars'
    and (storage.foldername(name))[1] in (
      select group_id::text
      from public.group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Group admins delete banner"
  on storage.objects for delete using (
    bucket_id = 'group-banners'
    and (storage.foldername(name))[1] in (
      select group_id::text
      from public.group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
