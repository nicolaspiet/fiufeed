insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('group-avatars', 'group-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('group-banners', 'group-banners', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
