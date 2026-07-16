-- ════════════════════════════════════════════════════════════════
-- AlToque — Setup de Audit Trail + Notificaciones (2026-07-16)
--
-- CORRER EN: Supabase → SQL Editor (idempotente).
--
-- Complementa a la migración Drizzle 0001_bouncy_martin_li.sql
-- (`pnpm db:migrate`). Si preferís no correr drizzle-kit contra prod,
-- la sección 1 replica su DDL de forma segura (IF NOT EXISTS).
-- Las secciones 2 y 3 son SIEMPRE manuales (RLS + Realtime).
-- ════════════════════════════════════════════════════════════════

-- ── 1) DDL (equivalente a la migración 0001; saltear si ya migraste) ──
create table if not exists audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,                    -- sin FK a propósito: el log sobrevive al borrado de la cuenta
  action     text not null,           -- 'login' | 'failed_login' | 'password_change' | 'identity_link' | ...
  ip_address text,
  user_agent text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_user_created
  on audit_logs using btree (user_id, created_at);

alter table notifications add column if not exists link text;

-- ── 2) RLS del audit trail (inmutable para el cliente) ──
-- Los INSERT los hace solo el servidor (Drizzle con el rol owner, que
-- bypassa RLS). Desde el browser un usuario SOLO puede leer sus filas:
-- sin policies de insert/update/delete, esas operaciones quedan negadas.
alter table audit_logs enable row level security;

drop policy if exists audit_self_read on audit_logs;
create policy audit_self_read on audit_logs
  for select to authenticated
  using (user_id = auth.uid());

-- ── 3) Realtime para la campanita ──
-- Publica los INSERT de notifications (la entrega respeta RLS: cada
-- usuario recibe solo las suyas, ver notif_self_rw en postgis.sql).
do $$
begin
  alter publication supabase_realtime add table notifications;
exception
  when duplicate_object then null;  -- ya estaba publicada
end $$;

-- ── Verificación rápida (opcional) ──
-- select policyname from pg_policies where tablename = 'audit_logs';
-- select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and tablename = 'notifications';
