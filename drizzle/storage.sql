-- ════════════════════════════════════════════════════════════
-- AlToque — Supabase Storage: buckets + políticas
-- Correr en el SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════

-- Buckets (idempotente)
insert into storage.buckets (id, name, public)
values
  ('verification', 'verification', false),  -- privado: DNI + selfie
  ('job-photos',   'job-photos',   true),   -- público: fotos de trabajos
  ('avatars',      'avatars',      true)    -- público: avatares
on conflict (id) do nothing;

-- ── verification (privado) ──
-- Los archivos van bajo una carpeta = uid del dueño: 'verification/{uid}/...'.
-- Lectura/subida: solo el dueño. El admin lee con service_role (bypassa RLS).
drop policy if exists verif_owner_rw on storage.objects;
create policy verif_owner_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── job-photos (público) ──
drop policy if exists jobphotos_public_read on storage.objects;
create policy jobphotos_public_read on storage.objects
  for select using (bucket_id = 'job-photos');
drop policy if exists jobphotos_owner_write on storage.objects;
create policy jobphotos_owner_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── avatars (público) ──
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists avatars_owner_write on storage.objects;
create policy avatars_owner_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
