-- ─────────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audio-whistles', 'audio-whistles', true,  6291456,  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']),
  ('avatars',        'avatars',        true,  2097152,  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('banners',        'banners',        true,  4194304,  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Storage RLS: public read, authenticated write to own folder
create policy "Public audio read"
  on storage.objects for select using (bucket_id = 'audio-whistles');

create policy "Authenticated users upload audio"
  on storage.objects for insert with check (
    bucket_id = 'audio-whistles' and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own audio"
  on storage.objects for delete using (
    bucket_id = 'audio-whistles' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public avatar read"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Authenticated users upload avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public banner read"
  on storage.objects for select using (bucket_id = 'banners');

create policy "Authenticated users upload banner"
  on storage.objects for insert with check (
    bucket_id = 'banners' and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own banner"
  on storage.objects for update using (
    bucket_id = 'banners' and (storage.foldername(name))[1] = auth.uid()::text
  );
