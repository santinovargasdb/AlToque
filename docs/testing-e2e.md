# AlToque — Checklist de testing manual end-to-end

**Objetivo:** validar los flujos principales del producto con los 24 profesionales sembrados en producción. Es la primera pasada real end-to-end. Todo lo que rompa acá es un bug que arreglar antes de tener usuarios reales.

**Duración estimada:** 45-60 minutos si todo va bien; más si aparecen bugs.

---

## Preparación

### Cuentas que vas a necesitar

- **Un profesional sembrado** para el lado provider — sugerido: `pro01-plomeria@altoque.test` (Juan Pérez, Palermo, online). Password: `Test1234!`
- **Un cliente** para el lado cliente — pueden ser dos opciones:
  - Usá tu cuenta personal existente
  - Creá una cuenta nueva con otro email tuyo, para probar el flujo de registro también

### Setup del navegador

Abrí dos ventanas de navegador **distintas** (no dos pestañas, dos ventanas) o usá una ventana normal + una de incógnito. En una vas a estar logueado como **cliente**, en la otra como **profesional**. Así podés ver los dos lados al mismo tiempo cuando hagas el flujo cruzado.

---

## Bloque 1 — Registro y login (~10 min)

Marcá con [x] cuando cada cosa funcione.

### Registro nuevo con email/password
- [x] Ir a `https://al-toque-eta.vercel.app/registro`
- [x] Elegir rol "Cliente", completar datos, registrarse
- [x] Recibir email de confirmación (revisá spam)
- [x] Confirmar email → redirige a completar perfil
- [x] Completar nombre y teléfono → llega al dashboard `/inicio`

### Login con Google (en la ventana del cliente)
- [x] Ir a `/ingresar`
- [x] Click "Continuar con Google"
- [x] Ver el warning "Google hasn't verified this app" — cliquear "Advanced" → "Continue"
- [x] Autorizar → llega al dashboard sin errores

**Red flags:**
- El registro tira error después de enviar el email
- El email de confirmación nunca llega
- Después de confirmar, quedás en un loop entre completar-perfil e inicio

### Login como profesional sembrado
- [x] En la ventana provider, ir a `/ingresar`
- [x] Loguearte con `pro01-plomeria@altoque.test` / `Test1234!`
- [x] Ver que caés en `/pro/inicio` (dashboard de provider), no en `/inicio`

**Red flag:** si te lleva a `/inicio` en vez de `/pro/inicio`, hay un problema con el resolución de rol en el middleware.

---

## Bloque 2 — Búsqueda y matching geográfico (~10 min)

Este bloque prueba que las funciones PostGIS `find_nearby_providers` funcionan correctamente.

En la ventana **cliente**:

### Búsqueda por oficio + zona correcta
- [x] Ir a `/buscar`
- [x] Elegir "Plomería" como oficio
- [x] Poner una dirección de Palermo (ej: "Av. Santa Fe 3200")
- [x] **Verificar que aparece Juan Pérez** (`pro01-plomeria`, está en Palermo)
- [x] También deberían aparecer los otros 2 plomeros (María González en Caballito, Carlos Rodríguez en Flores) si el radio los alcanza

### Búsqueda que NO debería matchear
- [x] Buscá "Cerrajería" en Vicente López
- [x] Los 3 cerrajeros están en Belgrano, Villa Urquiza y Almagro — dependiendo del `serviceRadiusKm` de cada uno, algunos aparecerán y otros no
- [x] Confirmá que **NO aparecen** los plomeros ni los electricistas en la lista

### Perfil de profesional
- [x] Cliqueá en Juan Pérez para ver su perfil
- [x] Verificá que se muestran: foto/avatar, bio, oficios (Plomería + Gasista, porque tiene secondarySlug), reviews (0 por ahora), rating (4.8), trabajos completados (37)

**Red flags:**
- La búsqueda devuelve profesionales de cualquier zona (no está filtrando por ubicación)
- No aparece ningún profesional aunque debería (query rota)
- Aparece Juan Pérez en Cerrajería (no está habilitado para ese oficio)

---

## Bloque 3 — Pedido agendado (~15 min)

En la ventana **cliente**:

### Crear pedido agendado
- [x] Desde el perfil de Juan Pérez, click "Solicitar trabajo" o similar
- [x] Tipo: "Agendado" (no urgencia)
- [x] Título: "Pérdida en el baño"
- [x] Descripción: "Canilla del lavamanos gotea desde hace 2 días"
- [x] Fecha y hora: mañana a las 10hs
- [x] Dirección: la que usaste antes en Palermo
- [x] Adjuntar 1 foto (cualquiera del disco)
- [x] Enviar

### Ver el pedido creado
- [x] Ir a `/pedidos`
- [x] Verificar que aparece con estado "Solicitado" o "Pendiente"

En la ventana **provider (Juan Pérez)**:

### Ver el pedido llegando
- [x] Ir a `/pro/pedidos` o `/pro/inicio`
- [x] Debería aparecer una notificación o un pedido nuevo en la lista
- [x] Abrir el pedido, ver título, descripción, foto y dirección
- [x] Aceptar

### Chat entre las partes
- [x] Como provider, escribir un mensaje en el chat del trabajo ("Hola, mañana estoy a las 10")
- [x] Ir a la ventana cliente, ir a `/mensajes` o al detalle del pedido
- [x] Verificar que el mensaje **aparece en tiempo real** (sin necesidad de refrescar)
- [x] Responder desde cliente
- [x] Verificar que el provider lo recibe en tiempo real

### Marcar como completado
- [x] Provider: marcar el trabajo como completado, cargar precio final ($5000 por ejemplo)
- [x] Cliente: verificar que se le pide dejar review

### Review
- [x] Cliente: dejar review (5 estrellas + comentario)
- [x] Provider: verificar que la review aparece en su perfil
- [x] Verificar que el contador `jobs_completed` de Juan Pérez aumenta a 38

**Red flags:**
- El pedido no le llega al provider correcto
- El chat no funciona en tiempo real (necesitás refrescar)
- Al marcar como completo, no cambia de estado
- La review no se guarda o no actualiza el rating

---

## Bloque 4 — Pedido urgente (~10 min)

Este prueba el dispatch a providers online.

En la ventana **cliente**:

### Crear urgencia
- [x] Ir a `/pedido/nuevo` o similar
- [x] Elegir "Urgencia" como tipo
- [x] Categoría: Electricista
- [x] Descripción: "Se cortó la luz en toda la casa"
- [x]Dirección: Palermo
- [x] Confirmar

### Verificar el dispatch (lado provider)
- [x] En la ventana provider, cambiá al usuario `pro01-electricista@altoque.test` (Diego Fernández, Palermo, online) — password `Test1234!`
- [x] Debería llegar una notificación de urgencia
- [x] Aceptar la urgencia
- [x] Verificar que otros electricistas online (Valeria en San Isidro) también la recibieron y ahora no la ven más porque Diego la aceptó
- [x] Alternativamente, si loguearte como Matías (`pro03-electricista`, offline), **NO** debería haberla recibido

**Red flags:**
- La urgencia se despacha a profesionales offline
- Se despacha a profesionales de otro oficio (plomeros reciben urgencia de electricista)
- Se despacha a profesionales fuera del radio geográfico
- Cuando uno acepta, los otros siguen viendo la urgencia disponible

---

## Bloque 5 — Gates y seguridad (~5 min)

Prueba que el middleware protege las rutas correctamente.

Como **cliente** (no admin, no provider):
- [x] Ir a `/admin` en la barra del navegador → debería redirigirte a `/inicio`
- [x] Ir a `/pro/inicio` → debería redirigirte a `/inicio`

Como **provider** (Juan Pérez):
- [x] Ir a `/admin` → redirige a `/pro/inicio`
- [x] Ir a `/inicio` (zona cliente) → redirige a `/pro/inicio`

**Sin loguearte** (ventana de incógnito):
- [x] Ir a `/inicio` → redirige a `/ingresar?returnUrl=/inicio`
- [x] Ir a `/pro/inicio` → redirige a `/ingresar?returnUrl=/pro/inicio`

**Red flag:** si podés acceder a una zona que no te corresponde, es un problema serio de seguridad.

---

## Bloque 6 — Detalles varios (~5 min)

- [x] Botón "Volver atrás" en headers funciona bien (lo agregamos hace poco)
- [x] `/privacidad` carga bien y se ve correctamente
- [x] En la landing pública, los enlaces a `/categorias/plomeria` etc. funcionan
- [x] Los meta tags SEO están presentes (podés ver el `<title>` en la pestaña del navegador)
- [x] Notificaciones push (si el navegador ya te pidió permiso, deberías recibir cuando llega un pedido)

---

## Cómo reportarme los bugs

Cuando termines la pasada, para cada bug que hayas encontrado pasame:

1. **Qué bloque y qué paso específico** (ej: "Bloque 3, en el chat, los mensajes no aparecen hasta refrescar")
2. **Qué esperabas que pasara**
3. **Qué pasó en cambio**
4. **Cualquier error visible** (mensaje en pantalla, console del navegador con F12, o error de Vercel)

Con eso te armo los prompts para Claude Code y los vamos arreglando.

Si algo del checklist no lo podés hacer porque falta funcionalidad (ej: no está construido todavía), avisame también — es información útil para saber qué falta.

---

## Después del testing

Con el resultado en la mano decidimos qué sigue:
- Si todo funciona: lanzás el testing a más gente cercana (family & friends) y vamos con la landing de la tecnicatura
- Si hay bugs críticos: los arreglamos primero
- Si hay bugs menores: los priorizamos y los metemos en la cola
