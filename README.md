# AlToque

> Marketplace web/PWA que conecta personas con **profesionales de oficios verificados** — plomeros, cerrajeros, carpinteros, techistas, electricistas, gasistas, pintores, albañiles — para **urgencias** y **trabajos agendados**.

Matching por geolocalización (PostGIS), pago híbrido (**efectivo = conectar** · **transfer/tarjeta = Mercado Pago con split**), comisión por trabajo. Mobile-first, instalable como PWA.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind v4 · shadcn/ui · Supabase (Postgres + PostGIS, Auth, Realtime, Storage) · Drizzle ORM · Mercado Pago · Google Maps Platform · Web Push (VAPID) · Serwist · Vercel.

## Puesta en marcha

### Prerrequisitos

- Node.js ≥ 20
- pnpm ≥ 9 (`corepack enable pnpm`)
- Cuenta **Supabase** (proyecto con PostGIS)
- App **Mercado Pago** Argentina en modo Marketplace
- Proyecto **Google Cloud** con Maps Platform (Maps JS + Places + Geocoding)
- Cuenta **Resend** (emails transaccionales)

### Pasos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar entorno
cp .env.example .env.local   # completar credenciales

# 3. Generar claves VAPID para Web Push
npx web-push generate-vapid-keys
#    → pegar VAPID_PUBLIC_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en .env.local

# 4. Base de datos
pnpm db:generate     # genera la migración desde src/lib/db/schema.ts
pnpm db:migrate      # aplica las migraciones
#    → luego correr en el SQL Editor de Supabase, en orden:
#      drizzle/postgis.sql        (PostGIS, índices GIST, find_nearby_providers, RLS)
#      drizzle/auth-triggers.sql  (perfil al registrarse + claim de rol)
#      drizzle/storage.sql        (buckets verification/job-photos/avatars + políticas)
#      drizzle/seed-categories.sql (los 8 oficios)

# 5. Desarrollo
pnpm dev             # http://localhost:3000
```

### Configuración de Supabase Auth (Step 3)

1. **Trigger de perfiles + claim de rol:** correr `drizzle/auth-triggers.sql`.
2. **Custom Access Token Hook:** Supabase → Authentication → Hooks →
   *Custom Access Token* → activar `custom_access_token_hook` (inyecta
   `user_role` en el JWT que leen RLS y el middleware).
3. **Login con código (OTP):** el login usa código de 6 dígitos. Editá el
   template de email en Supabase → Authentication → Email Templates →
   *Magic Link* para incluir el token, por ej.:
   `Tu código es: {{ .Token }}` (además del `{{ .ConfirmationURL }}`, que
   sigue funcionando como magic link vía `/auth/callback`).
4. **URLs de redirección:** agregá `http://localhost:3000/auth/callback`
   (y tu dominio en prod) en Authentication → URL Configuration.

## Scripts

| Script | Qué hace |
|--------|----------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build y arranque de producción |
| `pnpm lint` / `pnpm typecheck` | Lint + chequeo de tipos |
| `pnpm test` / `pnpm test:e2e` | Vitest / Playwright |
| `pnpm db:generate` / `pnpm db:migrate` | Migraciones Drizzle |
| `pnpm db:studio` | Drizzle Studio |

## Estructura

```
src/
  app/        (marketing) (auth) (app) (pro) (admin) + api/  — rutas por rol
  components/ ui · marketing · app · pro · admin · shared
  lib/        supabase · db · mercadopago · maps · push · notifications · validations
drizzle/      migrations · postgis.sql · seed-categories.sql
```

Ver **CLAUDE.md** para arquitectura, patrones y reglas no negociables, y el blueprint completo para el **Build Order** de 14 pasos.

## Documentación

- `CLAUDE.md` — guía de arquitectura y reglas del proyecto.
- Blueprint original — visión, modelo de datos, diseño de API y orden de construcción.
