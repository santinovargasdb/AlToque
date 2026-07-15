-- ════════════════════════════════════════════════════════════════
-- AlToque — Setup del bucket 'avatars' (fotos de perfil)
--
-- CORRER EN: Supabase → SQL Editor (una sola vez; es idempotente).
--
-- Este script es la causa más probable del error "al subir la foto":
-- sin el bucket y sus políticas RLS, Storage rechaza todo upload.
-- Complementa a drizzle/storage.sql (que crea los tres buckets de la
-- app); si ya lo corriste, este script solo refina 'avatars' con
-- límites server-side y políticas granulares. Correr ambos es seguro.
-- ════════════════════════════════════════════════════════════════

-- 1) Bucket público 'avatars' con límites aplicados POR SUPABASE
--    (defensa en profundidad: el front valida 2 MB / imagen, y el
--    servidor de Storage lo vuelve a exigir).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,                -- lectura pública (las fotos de perfil se muestran a todos)
  2097152,             -- 2 MB máximo por archivo
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Políticas RLS sobre storage.objects.
--    Convención de paths de la app: 'avatars/{auth.uid()}/avatar-{ts}.{ext}'
--    → la carpeta raíz del objeto es el uid del dueño.

-- Se reemplaza la política genérica de drizzle/storage.sql (si existía)
-- por políticas granulares equivalentes pero explícitas.
drop policy if exists avatars_owner_write  on storage.objects;
drop policy if exists avatars_public_read  on storage.objects;
drop policy if exists avatars_owner_insert on storage.objects;
drop policy if exists avatars_owner_update on storage.objects;
drop policy if exists avatars_owner_delete on storage.objects;

-- 2a) Lectura: pública (cualquiera, incluso sin sesión, puede ver avatares).
create policy avatars_public_read on storage.objects
  for select
  using (bucket_id = 'avatars');

-- 2b) Subida: solo usuarios autenticados y SOLO dentro de su propia carpeta.
create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2c) Actualización: ídem, solo el dueño sobre sus propios archivos.
create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2d) Borrado: el dueño puede limpiar sus avatares viejos (la app además
--     hace esta limpieza server-side con service_role, que bypassa RLS).
create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Verificación rápida (opcional) ──
-- select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'avatars';
-- select policyname from pg_policies
--   where tablename = 'objects' and policyname like 'avatars%';
