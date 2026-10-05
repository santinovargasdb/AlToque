# Reseñas por aspectos (KPIs de reputación) — Diseño

**Fecha:** 2026-10-05
**Estado:** Aprobado para planificar

## Contexto y problema

Hoy una reseña es un único puntaje de 1 a 5 estrellas (`reviews.rating`) más un comentario opcional. Una estrella "4" no dice *en qué* fue bueno o malo el trabajo, así que la nota general significa poco. Queremos que la calificación sea accionable: que el usuario puntúe **aspectos concretos** del profesional y que la estrella general sea el promedio de esos aspectos.

El sistema de reseñas ya es **bidireccional** (el profesional también reseña al cliente, `submitReview` en `src/lib/actions/review.ts`), pero esa reseña hoy se guarda y no se muestra en ningún lado, y el cliente no tiene reputación agregada. Vamos a aprovechar esa bidireccionalidad: el profesional califica aspectos del cliente, y esa reputación es **visible para otros profesionales** al recibir un pedido.

**Resultado buscado:** que la nota de estrellas refleje un promedio de aspectos concretos, con desglose visible, en las dos direcciones (cliente↔profesional).

## Decisiones de producto (cerradas)

1. **Aspectos del profesional** (los puntúa el cliente): Puntualidad · Calidad del trabajo · Trato y comunicación · Precio justo.
   - "Precio justo" = cobró lo acordado / relación precio-valor, **no** "¿fue caro?" (AlToque no interviene en el pago).
2. **Aspectos del cliente** (los puntúa el profesional): Trato y respeto · Puntualidad / disponibilidad · Claridad del pedido · Pago acordado.
3. **Nota general = promedio de los 4 aspectos** de esa reseña (en cada dirección). No se pide una estrella "general" aparte.
4. Los **4 aspectos son obligatorios** (1–5 cada uno); el **comentario sigue opcional**.
5. **Sin preview en vivo** de la nota general mientras se puntúa: se puntúan los 4 aspectos y el total se calcula al enviar; queda en el resumen/perfil.
6. **Reputación del cliente visible al profesional**: el pro ve la **nota general** del cliente + cantidad de reseñas por defecto, con un **desplegable "Ver detalle"** que expande el desglose por aspecto. Mínima información en pantalla, panorama completo a un clic.
7. Un cliente/profesional **sin reseñas todavía** se muestra como "Nuevo · sin calificaciones", nunca como 0 estrellas.

## Modelo de datos

Enfoque elegido: **tabla normalizada de aspectos** (una fila por aspecto puntuado). Sirve igual para las dos direcciones (el campo `aspect` define el significado), permite el desglose por aspecto con un `GROUP BY` limpio y no obliga a migrar columnas si cambian los aspectos.

### `review_aspects` (nueva)
- `id` uuid PK
- `review_id` uuid NOT NULL → `reviews.id` ON DELETE CASCADE
- `aspect` enum `review_aspect` NOT NULL — una de las 8 claves (ver `lib/reviews/aspects.ts`)
- `score` smallint NOT NULL — CHECK 1–5
- Índice: `(review_id)`; unique `(review_id, aspect)` (un puntaje por aspecto por reseña)

### `reviews` (existente, `src/lib/db/schema.ts`)
- `rating` pasa de `integer` a `numeric(2,1)` para guardar la **nota general con 1 decimal** (= promedio de los 4 aspectos de esa reseña; para reseñas viejas, su valor original). CHECK 1.0–5.0.
- El resto (`jobId`, `authorId`, `targetId`, `comment`, unique `(jobId, authorId)`) se mantiene.

### `profiles` (existente) — reputación del cliente
- Agregar `ratingAvg numeric(2,1)` y `ratingCount integer NOT NULL DEFAULT 0`, cacheados para mostrar la reputación del cliente en listados de pedidos sin recalcular.
- El profesional mantiene su agregado donde está hoy (`provider_profiles.ratingAvg`); no se toca esa columna.

### Aritmética de agregados
- **Nota general de una reseña** = `round(avg(los 4 scores), 1)` → se guarda en `reviews.rating`.
- **Promedio del target** (pro o cliente) = `avg(reviews.rating)` de las reseñas donde es `targetId`, redondeado a 1 decimal → se cachea en `provider_profiles.ratingAvg` (pro) o `profiles.ratingAvg` (cliente), junto con el conteo.
- **Desglose por aspecto** (para el perfil / detalle) = `avg(score) GROUP BY aspect` sobre `review_aspects` de las reseñas del target. Se calcula **on-demand** al renderizar el perfil/detalle (no se cachea: no se usa en listados). Las reseñas viejas sin aspectos simplemente no aportan al desglose.

## Fuente central de aspectos — `src/lib/reviews/aspects.ts` (nuevo)

Constantes tipadas, única fuente de verdad para UI, validación y agregación:

```ts
export const PROVIDER_ASPECTS = [
  { key: "punctuality",   label: "Puntualidad" },
  { key: "quality",       label: "Calidad del trabajo" },
  { key: "communication", label: "Trato y comunicación" },
  { key: "price",         label: "Precio justo" },
] as const;

export const CLIENT_ASPECTS = [
  { key: "respect",      label: "Trato y respeto" },
  { key: "availability", label: "Puntualidad / disponibilidad" },
  { key: "clarity",      label: "Claridad del pedido" },
  { key: "payment",      label: "Pago acordado" },
] as const;
```

- La **dirección** se deriva del rol del autor respecto al job (ya se calcula en `submitReview`: `isClient` → reseña al pro → `PROVIDER_ASPECTS`; `isProvider` → reseña al cliente → `CLIENT_ASPECTS`).
- El enum `review_aspect` de la DB contiene las 8 claves.

## Server Action — `submitReview` (`src/lib/actions/review.ts`)

Cambios sobre la lógica existente (que ya valida sesión, job completado, que el autor sea parte y el target forzado):
1. Recibe `aspects: Record<aspectKey, score>` (4 entradas) en lugar de un único `rating`.
2. Determina el set de aspectos esperado según la dirección y valida que vengan exactamente esos 4, cada uno 1–5 (vía Zod, ver abajo).
3. Calcula la nota general = `round(avg(4 scores), 1)`.
4. En la transacción: inserta `reviews` (con `rating` = nota general) + las 4 filas de `review_aspects`.
5. Recalcula el agregado **del target** (hoy solo lo hace para el pro): `avg(reviews.rating)` + conteo → `provider_profiles.ratingAvg` si el target es pro, o `profiles.ratingAvg/ratingCount` si es cliente.
6. `revalidatePath` de los detalles de pedido y del perfil (como hoy; agregar el perfil del cliente si corresponde).

## Validación — `src/lib/validations/job.ts`

Se valida en dos capas, porque el servidor no conoce la dirección hasta cargar el job:

1. **Forma (Zod, `reviewSchema`):** `jobId`, `targetId`, `comment` opcional (máx 1000) y un `aspects: Record<string, number>` con exactamente 4 entradas, cada `score` `z.number().int().min(1).max(5)` y cada clave perteneciente al enum `review_aspect` (las 8 claves).
2. **Set según dirección (en `submitReview`):** una vez determinado `isClient`/`isProvider` a partir del job, se verifica que las claves de `aspects` sean **exactamente** las del set esperado (`PROVIDER_ASPECTS` si el autor es cliente, `CLIENT_ASPECTS` si es profesional). Si no coinciden → `{ ok: false, error: "Reseña inválida." }`. Así no se confía en el cliente para la dirección.

## UI

### Formulario — `src/components/shared/review-form.tsx`
- Recibe la **dirección** (o el set de aspectos) como prop y renderiza **4 filas de estrellas**, una por aspecto, con su etiqueta, tomadas de `lib/reviews/aspects.ts`.
- Cada fila 1–5, obligatoria. Se mantienen las animaciones motion ("peek") por fila.
- Comentario opcional, igual que hoy. Botón "Enviar reseña" habilitado recién con los 4 aspectos puntuados.
- Sin preview de la nota general.
- Los callers existentes (`src/app/(app)/pedido/[id]/page.tsx` cliente, `src/app/(pro)/pro/pedido/[id]/page.tsx` pro) pasan la dirección.

### Resumen de reseña — `src/components/shared/review-summary.tsx`
- Además del comentario, muestra los 4 puntajes de esa reseña.

### Perfil público del profesional — `src/app/(app)/profesional/[id]/page.tsx`
- Nota general grande (como hoy) + **desglose de los 4 aspectos** con su promedio. Query de desglose on-demand (ver agregados).

### Búsquedas / `ProviderCard` — `src/components/app/provider-card.tsx`
- Sin cambios: sigue mostrando solo la nota general.

### Reputación del cliente para el profesional — `src/app/(pro)/pro/pedido/[id]/page.tsx` (y tarjetas de pedidos)
- Muestra **nota general del cliente + cantidad de reseñas** por defecto.
- **Desplegable "Ver detalle"** (animado con motion) que expande el desglose por aspecto del cliente (query on-demand al expandir o al cargar el detalle).
- Cliente sin reseñas → "Nuevo · sin calificaciones".

## Migración

- Nueva tabla `review_aspects` + enum `review_aspect`; nuevos campos en `profiles`; cambio de tipo de `reviews.rating` a `numeric(2,1)`.
- Generar con `pnpm db:generate` → aplicar con `pnpm db:migrate`, siguiendo el runbook de `CLAUDE.md` (Session pooler para migrar; **nunca `db:push`**; PostGIS ya habilitado en prod).
- **RLS** de `review_aspects`: lectura pública (como `reviews`) y escritura solo del autor de la reseña padre. Va junto a las policies existentes (`drizzle/postgis.sql` o SQL doc análogo).
- **Sin backfill** de reseñas viejas: conservan su `rating` general (convertido a numeric) y no aportan al desglose por aspecto. Como prod se saneó recientemente, el volumen afectado es mínimo.

## Testing / verificación

- **Unit (Vitest):** `reviewSchema` acepta 4 aspectos válidos según dirección y rechaza (falta un aspecto, score fuera de 1–5, set de aspectos de la dirección equivocada). Cálculo de la nota general = promedio redondeado.
- **Integración (DB de test, patrón de `tests/integration/`):** `submitReview` inserta `reviews` + 4 `review_aspects`, recalcula `ratingAvg/ratingCount` del target (pro y cliente), respeta la unicidad `(jobId, authorId)` y rechaza direcciones/targets inválidos.
- **Manual (`pnpm dev`):** reseñar un trabajo completado desde el cliente (4 aspectos del pro) y desde el pro (4 aspectos del cliente); verificar el desglose en el perfil del pro y la reputación + desplegable del cliente en el detalle del pedido del pro; verificar "Nuevo · sin calificaciones".
- **Siempre:** `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Fuera de alcance (YAGNI)

- Editar o borrar reseñas ya enviadas.
- Mostrar el desglose por aspecto en `ProviderCard` / búsquedas (solo nota general).
- Cachear los promedios por aspecto (se calculan on-demand).
- Backfill o recálculo masivo de reseñas históricas.
- Ponderaciones distintas entre aspectos (todos pesan igual).
