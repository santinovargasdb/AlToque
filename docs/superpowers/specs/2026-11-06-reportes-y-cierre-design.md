# Reportes, cierre por el cliente y suspensión

Aprobado por el usuario el 2026-11-06 (opción A).

## Problema

- Solo el profesional puede marcar un trabajo como completado, y las reseñas dependen de ese estado. Un profesional que no cumple evita la mala nota.
- `/pro/suscripcion` promete "Soporte directo en disputas", pero no hay forma de reportar ni de suspender a un profesional.

## Alcance

### Cierre por el cliente

En un pedido `accepted` o `in_progress`, el cliente ve "Cerrar trabajo" con dos salidas:

- **"Se hizo":** el pedido pasa a `completed`, suma 1 a `jobs_completed` y habilita las reseñas de ambas partes. `final_price` queda vacío si el profesional no lo cargó.
- **"No se hizo o hubo un problema":** el pedido pasa a `cancelled` con `cancel_reason = 'not_completed'`, se crea un reporte en la misma transacción y el cliente puede reseñar al profesional. Exige motivo y descripción.

Las dos transiciones usan el estado esperado en el `WHERE`, igual que `updateJobStatus`.

`submitReview` acepta, además de `completed`, un pedido `cancelled` con `cancel_reason = 'not_completed'`, solo para el cliente. El profesional no reseña ese pedido: su vía es reportar.

### Reportes

Tabla nueva `job_reports`, con RLS habilitado y sin policies (se accede solo desde el servidor):

| Columna | Detalle |
|---|---|
| `id` | uuid, clave primaria |
| `job_id` | referencia a `jobs` |
| `reporter_id` | quien reporta, una de las partes |
| `target_id` | la otra parte; lo fija el servidor |
| `reason` | enum: `no_show`, `not_completed`, `theft_or_damage`, `bad_behavior`, `payment`, `other` |
| `description` | texto de 10 a 1000 caracteres |
| `status` | enum: `open`, `resolved`, `dismissed`; por defecto `open` |
| `admin_note` | nota de quien lo resuelve |
| `created_at`, `resolved_at`, `resolved_by` | seguimiento |

Índice único sobre `(job_id, reporter_id)`: un reporte por parte y por trabajo.

Se puede reportar un pedido con profesional asignado, en cualquier estado salvo `requested` y `broadcasting`, siempre que quien reporta sea una de las partes.

### Panel de admin

`/admin/reportes` lista los reportes, primero los abiertos, con el pedido y las dos partes. Se agrega al menú del admin. Acciones:

- **Resolver:** `status = 'resolved'`, con nota obligatoria.
- **Descartar:** `status = 'dismissed'`, con nota obligatoria. Si el pedido estaba en `not_completed`, borra la reseña del cliente sobre ese pedido y recalcula la nota del profesional, en la misma transacción.
- **Suspender al profesional:** disponible si el reportado es profesional.
  - `verification_status = 'rejected'`, con el motivo en `rejection_reason`, e `is_online = false`.
  - Si tiene una suscripción activa con `mp_preapproval_id`, se pausa en Mercado Pago. Si esa pausa falla, la suspensión se aplica igual y el admin ve un aviso para resolverlo a mano.
  - Se avisa por campanita y push, con un texto propio: el de verificación rechazada le pediría reenviar documentos.
  - El reporte queda `resolved`, con la suspensión como nota.

Los trabajos ya aceptados por un suspendido no se cancelan automáticamente.

### Texto

"Soporte directo en disputas" pasa a "Soporte ante reclamos".

## Fuera de alcance

- Suspender clientes: un reporte contra un cliente se ve y se resuelve, pero no lo bloquea.
- Descargos, evidencia adjunta y un estado de disputa.
- Avisos por email al admin, porque los emails siguen apagados.

## Decisiones y límites conocidos

- La suspensión reutiliza `rejected`, que ya cierra el acceso en la búsqueda, el despacho y `providerCanReceiveJobs`, sin tocar PostGIS. Un suspendido puede volver a subir documentos y pasar a `pending`, pero no aparece hasta que un admin lo apruebe.
- "Se hizo" lo decide solo el cliente: un cierre anticipado consume uno de los trabajos gratis del profesional, que puede reportarlo.
- Volver a aprobar a un suspendido no reactiva su suscripción: queda pausada en Mercado Pago y hay que reactivarla a mano.
- El borrado de la reseña al descartar depende de `not_completed`, así que se construye con el cierre por el cliente.

## Despliegue

1. Generar la migración con `pnpm db:generate` y agregarle `ENABLE ROW LEVEL SECURITY`, para que la tabla nunca quede abierta.
2. Aplicarla en producción antes del deploy.

## Pruebas

Integración contra la base de test: las dos salidas del cierre, doble envío, reseña en `not_completed`, reportes de cada parte y de un ajeno, duplicados, resolver y descartar, permisos de admin, suspensión con y sin suscripción, y fallo de Mercado Pago.
