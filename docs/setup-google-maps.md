# Configurar Google Maps en AlToque — paso a paso

Estado al 2026-07-31: proyecto Google Cloud `AlToque` (`altoque-504014`) con
facturación en **free trial** (US$300, hasta el 30/10/2026) y las tres APIs ya
habilitadas: Maps JavaScript API, Places API, Geocoding API.

Falta: crear las keys, restringirlas, cargarlas en Vercel y redeployar.

> **Nota sobre el gasto:** las cuotas de Maps Platform ya no son ajustables
> (Google lo sacó; en la pantalla de Quotas todas dicen "Quota is not
> adjustable"). El tope real hoy es el free trial: Google no cobra durante el
> trial y no se auto-convierte a cuenta paga. Mientras no aprietes el botón
> **Activate**, el cobro es imposible.

---

## Parte A — Crear la key del navegador

Esta key viaja al browser dentro del bundle de JavaScript, así que es pública
por definición. Lo que la protege no es el secreto sino la restricción por
dominio: aunque alguien la copie, solo funciona desde tu sitio.

1. En Google Cloud, asegurate de estar en el proyecto **AlToque** (selector de
   arriba, al lado del logo).
2. Menú izquierdo (dentro de Google Maps Platform) → **Keys & Credentials**.
3. Botón **+ Create credentials** → **API key**.
4. Se abre un popup con la key recién creada. Clic en **Edit API key**.
   (Si lo cerraste sin querer: la key aparece en la lista, clic en su nombre.)
5. En **Name**, poné `AlToque Browser` — así después las distinguís.
6. En **Application restrictions**, seleccioná el radio button **Websites**.
7. Aparece la sección *Website restrictions*. Clic en **ADD**, escribí y confirmá
   con **DONE**, una por vez:

   ```
   https://al-toque-eta.vercel.app/*
   http://localhost:3000/*
   ```

   El `/*` del final es obligatorio: sin él Google solo autoriza la home y el
   mapa falla en el resto de las páginas.

8. Bajá hasta **API restrictions** y seleccioná **Restrict key**.
9. Se habilita un desplegable *Select APIs*. Tildá exactamente estas tres:
   - Maps JavaScript API
   - Places API
   - Geocoding API

   Confirmá con **OK**.
10. Botón **SAVE** abajo de todo.
11. Volvé a **Keys & Credentials** y copiá el valor de la key con el ícono de
    copiar. Pegala en un bloc de notas por ahora, la vas a necesitar en la Parte D.

---

## Parte B — Crear la key del servidor

Esta la usa Vercel desde el backend para convertir direcciones en coordenadas.
Nunca sale al browser, así que no se restringe por dominio.

1. **Keys & Credentials** → **+ Create credentials** → **API key** (de nuevo).
2. **Edit API key**.
3. **Name:** `AlToque Server`.
4. **Application restrictions:** dejá **None**.

   > Por qué None y no una IP: las funciones serverless de Vercel salen por IPs
   > dinámicas que cambian sin aviso. Restringir por IP te rompería la app en
   > cualquier momento.

5. **API restrictions** → **Restrict key** → tildá **solo Geocoding API** → OK.
6. **SAVE**.
7. Copiá también esta key al bloc de notas. Ahora tenés dos, no las mezcles.

---

## Parte C — Alerta de presupuesto

No frena el gasto (Google no ofrece eso), pero te avisa por mail. Vale la pena
tenerla configurada para el día que actives la cuenta paga.

1. Menú ☰ (arriba a la izquierda) → **Billing**.
2. Menú izquierdo → **Budgets & alerts**.
3. Botón **CREATE BUDGET**.
4. **Name:** `AlToque alerta`. Dejá el scope como viene (toda la cuenta).
   **NEXT**.
5. En **Budget type** elegí *Specified amount* y poné **1** (un dólar).
   La idea es que salte apenas haya cualquier consumo real. **NEXT**.
6. Dejá los umbrales que vienen por defecto (50%, 90%, 100%) y verificá que esté
   tildado **Email alerts to billing admins and users**.
7. **FINISH**.

---

## Parte D — Cargar las keys en Vercel

1. Entrá a tu proyecto en Vercel → **Settings** → **Environment Variables**.

2. **Primero borrá las viejas**, que tienen valores que no sirven. En cada una,
   el menú **⋯** de la derecha → **Remove**:
   - `GMAPS_SERVER_KEY`
   - `NEXT_PUBLIC_..._BROWSER_KEY` (la que empieza con `NEXT_PUBLIC` y termina
     en `BROWSER_KEY`)

3. **Agregá las dos nuevas.** Los nombres tienen que ser EXACTOS — así los lee
   `src/lib/env.ts`, cualquier variación y la app no las encuentra:

   | Key (nombre) | Value (valor) |
   |---|---|
   | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | la key `AlToque Browser` de la Parte A |
   | `GOOGLE_MAPS_SERVER_KEY` | la key `AlToque Server` de la Parte B |

   En **Environments** tildá **Production** y **Preview**. **Save** en cada una.

---

## Parte E — Redeploy sin caché

Este paso no es opcional. Las variables `NEXT_PUBLIC_*` no se leen en tiempo de
ejecución: Next las **incrusta en el JavaScript durante el build**. Si reusás el
build anterior, la key nueva no entra y no cambia nada.

1. Pestaña **Deployments**.
2. En el deployment de Production más reciente, menú **⋯** → **Redeploy**.
3. **DESTILDÁ** la casilla *Use existing build cache*.
4. **Redeploy** y esperá a que quede en **Ready** (1-2 minutos).

---

## Parte F — Probar

1. Abrí `al-toque-eta.vercel.app/buscar`.
2. El mapa tiene que renderizar en vez del cartel gris que pedía configurar
   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
3. Andá al wizard de pedido y escribí una dirección en el campo de ubicación:
   tienen que aparecer las sugerencias de Google Places.

---

## Si algo falla

Abrí la consola del navegador (F12 → pestaña Console). Los errores de Maps son
explícitos y cada uno tiene una causa distinta:

| Error en consola | Qué pasó | Cómo se arregla |
|---|---|---|
| `RefererNotAllowedMapError` | El dominio desde el que abriste no está en la lista de la Parte A, paso 7 | Agregá esa URL exacta con `/*` al final |
| `ApiNotActivatedMapError` | Falta habilitar una API en el proyecto | APIs & Services → Library → habilitala |
| `InvalidKeyMapError` | La key está mal copiada o quedó un espacio | Recopiala de Keys & Credentials |
| `BillingNotEnabledMapError` | La facturación no está asociada al proyecto | Billing → Link a billing account |
| Sigue el cartel de "Configurá NEXT_PUBLIC_..." | La variable no llegó al build | Revisá el nombre exacto en Vercel y redeployá **sin caché** |
| El mapa carga pero no hay sugerencias de dirección | Places API sin habilitar, o la key restringida sin incluirla | Parte A paso 9 |

Los cambios de restricciones en las keys pueden tardar unos minutos en
propagarse. Si acabás de tocarlas y falla, esperá 5 minutos y probá de nuevo.

---

## Recordatorio: 30 de octubre de 2026

Ahí termina el free trial. Antes de esa fecha, entrá a Google Maps Platform →
**Metrics** y mirá cuántas llamadas hiciste realmente en tres meses. Los cupos
gratis son 10.000 mensuales por API (Dynamic Maps, Places Autocomplete,
Geocoding, cada uno por separado). Con ese dato decidís si activás la cuenta
paga o no.
