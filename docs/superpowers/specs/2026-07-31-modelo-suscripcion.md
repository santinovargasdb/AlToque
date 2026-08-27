# Modelo de suscripción mensual — especificación

**Fecha:** 31 de julio de 2026
**Estado:** propuesta para revisión. No implementa nada.
**Reemplaza:** los specs `2026-06-17-step-9a-mp-payments-escrow-design.md` (escrow) y
`2026-07-31-rediseno-pagos.md` (rediseño de comisiones). Ambos quedan obsoletos.

---

## 1. El cambio

Decisión del equipo (Producto + Administración): **AlToque deja de participar del pago del
servicio.** Cliente y profesional acuerdan el precio y el medio de pago entre ellos, sin
intervención de la plataforma. El ingreso pasa a ser una **suscripción mensual**.

Lo que esto resuelve, respecto de todo lo discutido antes:

- No hay custodia de fondos de terceros → desaparece la exposición legal e impositiva
- No hay transferencias manuales → desaparece el techo de escalabilidad
- No hay comisión que perseguir → desaparece la deuda por trabajos en efectivo
- El ingreso se vuelve predecible y no depende del volumen de operaciones

Y algo menos obvio: **la desintermediación deja de ser un problema.** Con el modelo anterior,
que cliente y profesional arreglaran por fuera era una fuga de ingresos. Ahora es
indiferente, porque el ingreso ya no está atado a la transacción.

### Los tres planes

| Plan | Quién | Estado |
|---|---|---|
| Cliente gratuito | Usuarios | Funciones limitadas |
| Cliente premium | Usuarios | Pago mensual |
| Profesional premium | Trabajadores | Pago mensual, requerido para recibir pedidos |

---

## 2. Los dos riesgos del modelo, y qué hacer con ellos

Antes de la parte técnica, porque condicionan el diseño.

### 2.1 La frecuencia de uso del cliente no acompaña una cuota mensual

Es el riesgo más serio y conviene mirarlo de frente. **Nadie necesita un plomero todos los
meses.** La necesidad típica de un hogar es de dos o tres veces al año, y a veces menos. Una
suscripción mensual sobre un uso tan esporádico tiene un problema estructural: el cliente
paga once meses en los que no usa nada, ve el débito en el resumen, y da de baja.

Esto no significa que no se pueda cobrar del lado del cliente. Significa que **no puede
venderse como acceso a funciones.** Vendido así, la comparación mental del usuario es
"pago todos los meses por algo que no uso" y pierde siempre.

**La reformulación que lo hace funcionar es venderlo como asistencia, no como software.**
Es una categoría que en Argentina la gente ya conoce y compra: la asistencia al hogar que
viene con las tarjetas y los seguros. La propuesta deja de ser "tenés acceso a urgencias" y
pasa a ser "tenés resuelta la emergencia cuando pase", con una promesa concreta:
disponibilidad garantizada, tiempo de respuesta acotado y una cantidad de urgencias incluidas
por año. Ahí el cliente no está pagando uso, está pagando tranquilidad, y eso sí sostiene un
débito mensual.

**Alternativa, si el equipo no quiere ir por ese lado:** cobrarle al cliente **por urgencia
despachada**, como cargo único, en vez de una cuota. Se ajusta mucho mejor al patrón de uso
real y no genera churn. Pierde la previsibilidad del ingreso recurrente, pero es más honesto
con el comportamiento del usuario. Vale evaluarlo antes de fijar el modelo.

### 2.2 El arranque en frío del lado del profesional

Cobrarle una cuota mensual a un profesional que todavía no recibió ningún pedido es muy
difícil. Con el modelo de comisión esto no pasaba, porque solo pagaba cuando ganaba; con
suscripción, el riesgo se le traslada a él y lo asume antes de ver ningún resultado.

**Recomendación: que el período gratuito se mida en resultados, no en calendario.** En vez de
"tres meses gratis", que es una cuenta regresiva que corre aunque no pase nada, usar
**"gratis hasta completar los primeros N trabajos"**, con un tope de tiempo generoso como
respaldo. Así el cobro arranca recién cuando el profesional ya comprobó que la plataforma le
trae trabajo, que es exactamente el momento en que pagar se vuelve razonable.

---

## 3. Qué incluye cada plan

### Propuesta para el corte entre cliente gratuito y premium

El criterio: que la línea caiga sobre **el diferencial real del producto**, no sobre
funciones arbitrarias. En esta app ese diferencial son las **urgencias** — está en el nombre.

| | Gratuito | Premium |
|---|---|---|
| Buscar profesionales verificados | Sí | Sí |
| Ver perfiles, reseñas y calificaciones | Sí | Sí |
| Pedidos **agendados** | Sí | Sí |
| Pedidos **urgentes** (despacho inmediato) | No | Sí |
| Tiempo de respuesta garantizado | — | Sí |
| Chat con el profesional | Solo del trabajo en curso | Historial completo |
| Fotos por pedido | Límite bajo | Sin límite |

Por qué las urgencias son el gate correcto:

1. **Es donde está la disposición a pagar.** Un caño roto a las dos de la mañana es el
   momento de máxima urgencia y mínima sensibilidad al precio
2. **Es el diferencial defendible.** Buscar un plomero agendado se puede hacer en cualquier
   lado; el despacho inmediato con profesionales en línea, no
3. **Es limpio de implementar.** El circuito urgente ya es una rama de código separada
   (`createJob` en su variante urgente, `job_dispatch`, `find_nearby_online_providers`), así
   que el gate se aplica en un punto, no repartido por toda la app

### Profesional

Sin suscripción activa, un profesional **no recibe pedidos nuevos**. Pero conserva todo lo
demás, que es lo que hace la diferencia entre pausar y expulsar:

- Mantiene su perfil, su historial, sus reseñas y su calificación
- **Puede terminar los trabajos ya aceptados**, incluido el chat de esos trabajos
- Puede reactivarse pagando, sin volver a verificar identidad ni recargar nada

---

## 4. Cómo funciona el cobro recurrente en Mercado Pago

MP resuelve esto con **suscripciones** (`preapproval`). El cliente autoriza una vez y los
cobros siguientes son automáticos.

- Se puede trabajar **con plan asociado** (se define un plan con su precio y frecuencia, y
  cada suscriptor se adhiere) o **sin plan**. Para tres planes fijos, con plan asociado es
  más ordenado
- Estados de una suscripción: `pending`, `authorized`, `paused`, `cancelled`
- **MP reintenta automáticamente** cuando un cobro es rechazado, y actualiza por su cuenta
  los datos de tarjetas vencidas o renovadas
- Admite saldo en cuenta, tarjetas de crédito y débito, y también medios offline

Ese último punto importa más de lo que parece: **una porción de los profesionales de oficios
puede no tener tarjeta de crédito.** Hay que verificar qué medios admite efectivamente el
cobro recurrente en la práctica, y prever un camino manual de pago mensual para quien no
pueda automatizarlo. Si el único medio viable fuera tarjeta de crédito, se estaría excluyendo
a una parte del padrón de profesionales, que es justo el lado que cuesta conseguir.

---

## 5. Modelo de datos

### Tabla nueva: `subscriptions`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `profile_id` | uuid | FK a `profiles` |
| `plan` | enum | `client_premium` \| `provider_premium` |
| `status` | enum | `pending` \| `active` \| `past_due` \| `paused` \| `cancelled` |
| `mp_preapproval_id` | text | **Único.** Idempotencia del webhook |
| `current_period_end` | timestamptz | Hasta cuándo está paga |
| `cancel_at_period_end` | boolean | Baja pedida, vigente hasta fin de período |
| `trial_ends_at` | timestamptz | Nulo si no aplica |
| `created_at` / `updated_at` | timestamptz | |

Índice único parcial sobre `mp_preapproval_id`, con el mismo criterio que hoy tiene
`uq_jobs_mp_payment_id`: **es la defensa contra el doble procesamiento** cuando MP reenvía
una notificación, y hay que ponerlo desde el principio.

El plan gratuito **no genera fila**. Ausencia de suscripción activa equivale a plan gratuito;
así no hay dos fuentes de verdad para lo mismo.

### Campo derivado en `provider_profiles`

Además de la tabla canónica, agregar `subscription_active boolean` en `provider_profiles`,
mantenido por el webhook.

El motivo es concreto: el filtro de suscripción tiene que aplicarse **dentro de las funciones
PostGIS** `find_nearby_providers` y `find_nearby_online_providers`, que ya filtran por
`approved` y por `is_online`. Sumar una condición sobre una columna de la misma tabla es
inmediato; hacer un join contra `subscriptions` dentro de esas funciones las complica y las
vuelve más lentas en el camino más caliente de la app.

### Bajas

- `commission_ledger` — la tabla completa
- `jobs`: `payment_status`, `price_estimate`, `commission_rate`, `commission_amount`,
  `mp_preference_id`, `mp_payment_id`
- `provider_mp_tokens` — tabla completa
- `provider_profiles`: `mp_user_id`, `mp_connected`

**Excepción: conservar `jobs.final_price`.** No mueve dinero, pero es el único registro del
volumen económico que pasa por la plataforma, y es el dato que va a hacer falta para
justificar el precio de la suscripción y para cualquier análisis del negocio. Que AlToque no
cobre sobre el trabajo no significa que no le convenga saber cuánto valió.

---

## 6. Ciclo de vida de la suscripción

```
              alta                 pago OK
   (sin fila) ────► pending ────────────────► active ◄─────┐
                      │                        │  ▲        │
                      │ rechazo                │  │        │ pago OK
                      ▼                        │  └────────┤
                  cancelled                    │       past_due
                                               │           │
                                pide baja      │           │ vence la gracia
                                               ▼           ▼
                                          cancelled    cancelled
                                       (al fin del período)
```

**Período de gracia.** Cuando un cobro falla, la suscripción pasa a `past_due` y **el gate no
se aplica todavía**: durante 7 días el profesional sigue recibiendo pedidos, con un aviso
visible en la app. Recién al vencer la gracia se corta.

La razón no es indulgencia, es evitar falsos positivos. Una tarjeta vencida o un rechazo
transitorio del banco son mucho más frecuentes que una baja deliberada, y cortarle los
pedidos a un profesional activo por un problema de cobro que se resuelve solo en 48 horas es
la clase de error que hace que se vaya de la plataforma. MP además reintenta por su cuenta
durante ese lapso.

**Baja pedida por el usuario.** Marca `cancel_at_period_end` y mantiene el servicio hasta que
termine el período ya pago. No se corta el mismo día: ya pagó por él.

---

## 7. Dónde se aplica el gate

Que quede escrito, porque disperso es donde se cuelan los agujeros.

**Profesional sin suscripción activa (y fuera de gracia):**

| Punto | Comportamiento |
|---|---|
| `find_nearby_providers` | No aparece en resultados de búsqueda |
| `find_nearby_online_providers` | No aparece en el despacho de urgencias |
| Alta de filas en `job_dispatch` | No se le generan |
| `acceptJob` | Rechaza, con mensaje explicando el motivo |
| Trabajos ya aceptados | **Funcionan normal**, incluido completar y cobrar |
| Chat de esos trabajos | Funciona normal |
| Perfil público | Sigue visible por link directo, sin aparecer en búsquedas |
| `/pro/inicio` | Muestra el estado de la suscripción y cómo reactivar |

**Cliente en plan gratuito:**

| Punto | Comportamiento |
|---|---|
| Pedido agendado | Permitido |
| Pedido urgente | Bloqueado, con la oferta de premium en el mismo lugar |
| Búsqueda y perfiles | Sin restricción |

---

## 8. Impacto sobre el código

### Se conserva

- **`lib/mercadopago/webhook.ts`** — la validación de firma HMAC y la idempotencia. Es la
  pieza más delicada del desarrollo de pagos y **sigue sirviendo**: cambian los tipos de
  evento a procesar, no el mecanismo de seguridad
- `lib/mercadopago/client.ts` — la configuración del SDK

### Se da de baja

- `lib/mercadopago/preference.ts`, `payments.ts`, `refund.ts`, `commission.ts`
- La rama de pago de `createJob` y toda la liquidación de `completeJob`
- El OAuth de Mercado Pago del profesional
- `/pro/cobros` y `/admin/comisiones` en su forma actual
- `tests/payments.test.ts` y `tests/integration/payments.test.ts`

No se comenta ni se deja detrás de un flag: se elimina. El historial de git lo conserva, y
código muerto de pagos conviviendo con código vivo de suscripciones es una fuente de
confusión garantizada.

### Se construye

- `lib/subscriptions/` — alta, consulta de estado, cancelación, procesamiento de eventos
- Migración con la tabla `subscriptions`, sus enums y el índice único
- Aplicación del gate en las dos funciones PostGIS y en las server actions
- `/pro/suscripcion` y `/perfil/suscripcion` — estado, alta, baja, historial
- `/admin/suscripciones` — reemplaza a comisiones: altas, bajas, ingreso recurrente, morosos
- Estado de suscripción visible en `/pro/inicio` y avisos de vencimiento
- Tests del ciclo de vida, con foco en el gate y en la idempotencia del webhook

---

## 9. Impacto sobre la consulta a Legales

**El documento enviado quedó desactualizado.** Corresponde un anexo.

| Pregunta original | Estado |
|---|---|
| 1 — Retención de fondos de terceros | **Sin objeto.** Ya no se retiene nada |
| 2 — Vínculo con los profesionales | **Sigue vigente y se vuelve más importante.** Un profesional que paga una cuota mensual por acceder a la plataforma tiene un vínculo comercial continuo con AlToque, distinto de quien pagaba una comisión ocasional. Corresponde revisar de nuevo el riesgo de que se interprete como relación laboral |
| 3 — Rol contractual y responsabilidad | **Vigente y cambia de sentido.** AlToque ahora es explícitamente ajena al pago del servicio, lo que en principio refuerza su carácter de intermediaria. Conviene confirmarlo y reflejarlo en los términos |
| 4 — Tratamiento fiscal | **Se simplifica.** Pasa a ser facturación de un servicio digital por suscripción |
| 5 — Reintegros | **Cambia de objeto.** Ya no es sobre una comisión sino sobre cuotas: baja, devolución proporcional, renovación automática |
| 6 — Documentación obligatoria | **Vigente y se amplía.** La contratación de un servicio de suscripción con renovación automática suele tener requisitos propios de información previa y de facilidad de baja. Corresponde verificar cuáles aplican |

---

## 10. Decisiones pendientes

Ninguna de estas se resuelve escribiendo código.

1. **Precio de cada plan.** Sin datos de uso, cualquier número es un supuesto. Conviene
   fijarlo bajo y ajustarlo, antes que al revés
2. **Si el plan premium del cliente se vende como asistencia** (sección 2.1) o si se
   reemplaza por un cargo por urgencia
3. **El umbral del período gratuito del profesional**: cuántos trabajos completados, y con
   qué tope de tiempo
4. **Qué medios de pago admite efectivamente el cobro recurrente**, y qué alternativa se le
   da a quien no tenga tarjeta
5. **Qué pasa con los profesionales que ya están en la plataforma** cuando se active el
   cobro. Hoy son cero, así que la ventana para definirlo sin costo político es ahora
6. **Si el plan del cliente se cobra por hogar o por persona**, en caso de ir por el
   encuadre de asistencia

---

## 11. Orden de implementación sugerido

Cada paso deja la app en un estado consistente y verificable.

1. Migración: tabla `subscriptions`, enums, índice único, `subscription_active`
2. `lib/subscriptions/` y adaptación del webhook a los eventos de suscripción
3. Pantallas de alta y estado, primero para el profesional
4. Gate en las funciones PostGIS y en las server actions, con el período de gracia
5. Baja del código de pagos por operación y de las pantallas de comisiones
6. `/admin/suscripciones`
7. Plan del cliente y gate de urgencias
8. Tests del ciclo completo y prueba en el entorno de pruebas de MP

**Antes del paso 1 conviene tener resueltas las decisiones 1, 2 y 3 de la sección anterior**,
porque condicionan el modelo de datos. Las demás pueden definirse sobre la marcha.
