# Publicar AlToque en Google Play

AlToque se publica como **Trusted Web Activity (TWA)**: un paquete Android
mínimo que abre la PWA en Chrome a pantalla completa. No hay código nativo que
mantener; lo que se actualiza en Vercel se ve en la app sin republicar.

> Los pasos de Play Console y de PWABuilder están escritos de memoria
> (2026-11-20). Las pantallas cambian seguido: si algo no coincide, seguí lo que
> diga la consola.

## Qué ya está hecho en el código

| Requisito de Google Play | Dónde está |
|---|---|
| Eliminar la cuenta desde la app | `deleteAccount` (`src/lib/actions/account.ts`) + `DeleteAccount` en `/perfil` y `/pro/perfil` |
| URL pública para pedir la baja | `/eliminar-cuenta` |
| Política de privacidad pública | `/privacidad` |
| Digital Asset Links | `/.well-known/assetlinks.json` (lee dos variables de entorno) |
| Manifest instalable | `src/app/manifest.ts` (íconos 192/512 + maskable, `start_url: /inicio`) |

## Antes de empezar

- Cuenta de desarrollador de Google Play: pago único de USD 25, titular mayor
  de 18 y verificación de identidad.
- Las cuentas personales nuevas tienen que correr una **prueba cerrada con al
  menos 12 testers durante 14 días** antes de poder publicar en producción.
  Conviene arrancarla cuanto antes.
- **Dominio:** el paquete queda atado al dominio. Si se va a pasar de
  `al-toque-eta.vercel.app` a un dominio propio, hacerlo ANTES de generar el
  paquete; cambiarlo después obliga a publicar una versión nueva.

## 1. Generar el paquete Android

1. Entrar a <https://www.pwabuilder.com>, poner la URL de producción y elegir
   **Package for stores → Android**.
2. Elegir un *Package ID* definitivo (no se puede cambiar después), por ejemplo
   `app.altoque.twa`.
3. Dejar que PWABuilder genere una clave de firma nueva y descargar el zip.
   Trae el `.aab`, el keystore y un `assetlinks.json` con la huella SHA-256.
4. **Guardar el keystore y sus contraseñas fuera del repo.** Si se pierden no
   se puede volver a subir una actualización con esa clave.

## 2. Conectar el sitio con la app

En Vercel → Settings → Environment Variables (Production):

- `ANDROID_PACKAGE_NAME`: el Package ID del paso anterior.
- `ANDROID_SHA256_FINGERPRINTS`: las huellas SHA-256 separadas por coma.
  Van **dos**: la de la clave de subida (la que generó PWABuilder) y la de
  *Play App Signing* (Play Console → Configuración → Firma de apps), que es la
  que firma lo que instala el usuario.

Redeployar y verificar que
`https://<dominio>/.well-known/assetlinks.json` muestre el paquete y las
huellas. Si falta una huella o está mal, la app abre con la barra del
navegador arriba.

## 3. Ficha y formularios de Play Console

- **Política de privacidad:** `https://<dominio>/privacidad`.
- **Eliminación de cuenta:** `https://<dominio>/eliminar-cuenta`.
- **Acceso a la app:** darle a Google un usuario cliente y uno profesional de
  prueba (con contraseña) para que puedan revisar las pantallas con login.
- **Público objetivo:** mayores de 18 (los Términos ya lo exigen).
- **Seguridad de los datos.** Datos que la app recolecta hoy:
  - Nombre, email y teléfono (cuenta y contacto entre las partes).
  - Foto de perfil (opcional).
  - Ubicación aproximada/precisa (zona del profesional y dirección del pedido).
  - Documento de identidad y selfie (solo profesionales, verificación).
  - Fotos y mensajes de los pedidos, reseñas.
  - Identificadores técnicos (IP, navegador) para seguridad.
  - Se cifran en tránsito, no se venden y el usuario puede pedir su borrado.
- **Recursos gráficos:** ícono de 512 px (`public/icons/icon-512.png`), gráfico
  de funciones de 1024 × 500 y al menos 2 capturas de teléfono.

## 4. Punto a resolver antes de enviar a revisión: la suscripción

Google exige su propio sistema de cobro para las suscripciones que desbloquean
funciones dentro de la app, y hoy se cobra con Mercado Pago. El pago del
trabajo entre cliente y profesional no entra en esa regla (es un servicio
físico). Antes de enviar a revisión hay que confirmar cómo aplica la política
de pagos de Play para Argentina y decidir si la versión de tienda vende la
suscripción adentro o solo la usa quien ya la contrató en la web.

## Notas técnicas

- **Notificaciones push:** en una TWA las muestra Chrome a nombre de la app;
  sigue funcionando el Web Push actual.
- **Login con Google:** funciona porque la TWA usa Chrome, no un WebView.
- **Baja de cuenta:** con historial (pedidos, reseñas o mensajes) el perfil se
  anonimiza en vez de borrarse; sin historial se borra entero. En los dos
  casos se borra el usuario de Supabase Auth y sus archivos del Storage.
