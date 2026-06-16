-- ════════════════════════════════════════════════════════════
-- AlToque — Seed de categorías (8 oficios)
-- Idempotente: correr en Supabase tras postgis.sql.
-- icon = nombre de ícono lucide-react.
-- ════════════════════════════════════════════════════════════
insert into categories (slug, name, icon, allows_urgent) values
  ('plomeria',     'Plomería',     'wrench',      true),
  ('cerrajeria',   'Cerrajería',   'key-round',   true),
  ('electricista', 'Electricista', 'zap',         true),
  ('gasista',      'Gasista',      'flame',       true),
  ('techista',     'Techista',     'house',       true),
  ('carpinteria',  'Carpintería',  'hammer',      false),
  ('pintor',       'Pintor',       'paintbrush',  false),
  ('albanil',      'Albañil',      'brick-wall',  false)
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      allows_urgent = excluded.allows_urgent;
