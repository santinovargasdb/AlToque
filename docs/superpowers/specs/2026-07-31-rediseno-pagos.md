# Rediseño del modelo de pagos — análisis de opciones

**Fecha:** 2026-07-31
**Estado:** análisis para decidir. No implementa nada.
**Reemplaza (si se aprueba):** la decisión #2 del spec `2026-06-17-step-9a-mp-payments-escrow-design.md`
(escrow vía cuenta de AlToque) y la #3 (payout manual).

---

## 1. Por qué revisamos el diseño

El modelo implementado en 9a/9b es **escrow vía la cuenta de Mercado Pago de AlToque**:
el cliente prepaga el estimado a la cuenta de la plataforma, la plata queda `held`, y al
completar se libera al profesional mediante una transferencia **manual**.

Dos objeciones, ambas válidas:

1. **El payout manual no escala.** Cada trabajo completado es una transferencia a mano. Con
   5 trabajos por semana se banca; con 50 por día es un puesto de trabajo.
2. **Custodiar plata de terceros expone legalmente.** Los fondos entran a una cuenta de MP
   propia. Ante un pago perdido, una transacción rechazada o dinero que queda retenido por
   error, quien responde es el titular de la cuenta. Y fiscalmente esos ingresos entran a
   los libros de AlToque aunque no le pertenezcan.

Las dos objeciones son estructurales del modelo elegido, no bugs de la implementación.

---

## 2. El problema que en realidad hay que resolver

La discusión se plantea como "proteger al cliente vs proteger al profesional", pero el riesgo
que define la viabilidad del negocio es otro:

> **¿Cómo se asegura AlToque de cobrar su comisión?**

El código actual ya muestra la fuga. En el flujo `cash`, el profesional cobra directo y queda
**debiéndole** la comisión a la plataforma (`commission_ledger` con `source='cash_debt'`,
`status='owed'`, saldado a mano desde `/admin/comisiones`). Eso es cobranza manual con riesgo
de incobrabilidad, sobre un negocio de márgenes chicos.

Y hay un riesgo mayor que ese: la **desintermediación**. Cliente y profesional se conocen a
través de la app, y a partir del segundo trabajo no hay nada que los obligue a volver a pasar
por ella. Todo diseño de pagos debería evaluarse por cuánto la resiste.

**Regla que se desprende:** cuanto más cerca esté el momento del cobro del momento del
encuentro físico, más se filtra la operación por afuera. Con las dos partes cara a cara, la
salida natural es "pagame en efectivo y listo".

---

## 3. Las opciones

### A — Cobrar al completar, con split de pagos

El profesional marca el trabajo terminado con el precio final, el cliente paga desde la app y
MP reparte automáticamente: el neto a la cuenta del profesional, la comisión a la de AlToque.

| | |
|---|---|
| ✅ | Sin custodia de fondos ajenos |
| ✅ | Sin transferencia manual |
| ✅ | El cliente paga sobre el precio real, no un estimado |
| ✅ | Sin límite de tiempo entre reserva y trabajo |
| ❌ | **Máxima exposición a desintermediación.** El cobro ocurre con ambos presentes |
| ❌ | Si el cliente no paga después de recibido el servicio, no hay palanca |
| ❌ | Requiere que cada profesional vincule su cuenta de MP (fricción de onboarding) |

**Mitigación posible:** exigir tarjeta tokenizada al reservar y cobrar automáticamente al
completar, sin acción del cliente. Elimina el momento "pagame en efectivo", pero agrega
fricción al alta y complejidad de implementación.

---

### B — Cobrar por adelantado, con split de pagos

El cliente paga el estimado al crear el pedido; MP lo reparte en el momento (neto al
profesional, comisión a AlToque).

| | |
|---|---|
| ✅ | Sin custodia ni transferencia manual |
| ✅ | La comisión se cobra sí o sí, antes de que nada pueda salir mal |
| ✅ | El profesional queda cubierto ante cancelaciones |
| ❌ | **El cliente queda desprotegido.** Si el profesional no aparece, el reintegro depende de que todavía tenga saldo en su cuenta |
| ❌ | Prepagar un estimado antes de que el plomero vea el problema es antinatural, sobre todo en urgencias |
| ❌ | Estimado ≠ precio final: si es mayor hace falta un segundo cobro; si es menor, un reintegro desde la cuenta del profesional |

El punto rojo es el primero. Aunque la plata no sea de AlToque, **el cliente le reclama a la
plataforma**, no al profesional. Se elimina el riesgo legal de custodia pero se abre uno
reputacional y de atención al cliente.

---

### C — Reserva de fondos (autorización sin captura)

Se congela el monto en la tarjeta del cliente sin que entre a ninguna cuenta, y se captura al
completar. Sobre el papel es el escrow ideal: nadie custodia nada.

**Descartada.** Tres límites de MP chocan de frente con el modelo:

- La autorización dura **5 días** y después se cancela sola → los trabajos agendados a más de
  una semana quedan afuera
- Solo funciona con **tarjeta de crédito** → quedan afuera transferencia y dinero en cuenta,
  que en Argentina son una porción enorme
- **Solo se puede capturar el monto total**, no parcial → el diseño de cobrar el estimado y
  reintegrar la diferencia si el precio final es menor es directamente imposible

Sirve como mecanismo puntual para urgencias que se resuelven en el día. No como modelo general.

---

### D — Fee de plataforma adelantado, resto libre ⭐

**No estaba entre las opciones originales y es la que recomiendo.**

Al reservar, el cliente paga **solo la comisión de AlToque** (el 12% del estimado) directo a la
cuenta de la plataforma. El resto lo arregla con el profesional como quieran: efectivo,
transferencia, lo que sea. AlToque no interviene en ese pago.

| | |
|---|---|
| ✅ | **No hay custodia de terceros.** Lo que entra es fee propio, ingreso legítimo de AlToque |
| ✅ | **No hay transferencia manual a nadie**, porque nunca se recibe plata del profesional |
| ✅ | **Se cobra siempre, incluso en los trabajos en efectivo** → desaparece `cash_debt` y la cobranza manual |
| ✅ | Es lo más simple de construir: no requiere OAuth de MP, ni split, ni vincular cuentas |
| ✅ | Resiste la desintermediación mejor que A: el cobro ocurre al reservar, lejos del encuentro |
| ✅ | El monto es chico, así que prepagar no genera la resistencia que genera prepagar el trabajo entero |
| ❌ | El cliente ve un cargo separado del precio del servicio → impacto en conversión |
| ❌ | La plataforma deja de mediar el pago grande → se pierde esa palanca de producto y de datos |
| ❌ | Cambia quién paga la comisión: hoy la absorbe el profesional, acá la paga el cliente |

Sobre el último punto: es una decisión de posicionamiento, no técnica. Se puede presentar como
"costo de servicio de la plataforma" (modelo Uber/Rappi, el cliente lo ve) o bajar el precio de
lista para que el total le dé parecido. Vale probar ambas.

**Extensión natural:** una vez que esto funcione, se puede ofrecer el pago del trabajo por la
app como **opción** (con split), para quien la quiera usar. Pero deja de ser crítico, porque el
ingreso de AlToque ya no depende de eso.

---

## 4. Recomendación

**D como modelo base**, con A (split, cobro al completar) como capa opcional más adelante.

El argumento central: D **desacopla el ingreso de AlToque del flujo de pago del servicio**. Hoy
esos dos están atados, y de ese acoplamiento salen las tres cosas que duelen — la custodia, el
payout manual y la deuda por comisión en efectivo. Desatarlos las elimina a las tres de una,
sin agregar complejidad; al contrario, saca componentes.

Además es lo que más rápido se puede poner en producción, y con cero profesionales cargados
hoy, la prioridad es tener un circuito cobrable andando y aprender del uso real.

**El riesgo que asume D**: la app pierde el rol de garante del pago. Si un profesional se
comporta mal, AlToque ya cobró y no tiene plata retenida con la cual responder. Eso se compensa
por otro lado — verificación de identidad (que ya existe), reviews (que ya existen) y la
posibilidad de dar de baja a un profesional. Es un modelo de reputación, no de garantía. Vale
decidirlo a conciencia, no por default.

---

## 5. Qué código se reusa

La buena noticia: casi todo. El trabajo hecho en 9a no se tira.

**Se reusa tal cual:**
- `lib/mercadopago/client.ts` — configuración del SDK
- `lib/mercadopago/webhook.ts` — validación de firma HMAC e idempotencia. Es la pieza más
  delicada y más valiosa, y es independiente del modelo
- `lib/mercadopago/preference.ts` — cambia el monto (fee en vez de estimado) y el título; la
  estructura queda
- `lib/mercadopago/refund.ts` — sigue haciendo falta para devolver el fee si el trabajo no se hace
- `lib/mercadopago/commission.ts` — la fórmula no cambia
- El índice único `uq_jobs_mp_payment_id` y toda la idempotencia a nivel base

**Cambia:**
- `createJob`: la preferencia se crea por el monto del fee, no por el estimado
- `completeJob`: se simplifica bastante — sin liberación de escrow ni reintegro parcial
- `commission_ledger`: `cash_debt`/`owed` dejan de existir como concepto; todo entra como
  `collected` al reservar
- `jobs.paymentStatus`: el enum se achica (`held`/`released` pierden sentido)
- `/pro/cobros` y `/admin/comisiones`: cambia qué muestran; el de admin se simplifica mucho
  porque desaparece la cobranza manual

**Deja de hacer falta:**
- El OAuth de MP del profesional y `provider_mp_tokens` (quedan latentes por si después se
  suma split)
- La transferencia manual de payout

---

## 6. Antes de decidir

Tres cosas que **no** se resuelven leyendo documentación de MP:

1. **Consultá con un contador** cómo se factura el fee de plataforma y qué implica para el
   monotributo o la categoría fiscal de AlToque. Es ingreso propio, así que es mucho más
   simple que el escrow, pero hay que emitir comprobante.
2. **Definí qué pasa si el trabajo no se hace.** ¿Se devuelve el fee? ¿Siempre, o solo si
   cancela el profesional? Esto define la política de reintegros y hay que escribirla en los
   términos antes de cobrar el primer peso.
3. **Probá el precio.** Un fee visible del 12% sobre un trabajo de $50.000 son $6.000 que el
   cliente ve antes de recibir nada. Puede ser demasiado. Quizás convenga un fee fijo por
   pedido, o un porcentaje menor con un mínimo. Es una decisión de negocio que conviene testear
   con usuarios reales antes de fijarla en el código.

---

## 7. Si se aprueba

Orden sugerido, cada paso verificable por separado:

1. Actualizar este spec con la decisión tomada y marcar como superadas las decisiones #2 y #3
   del spec de 9a
2. Probar el circuito actual en **sandbox de MP** con credenciales de prueba — sirve igual para
   entender el API antes de reescribir nada
3. Adaptar `createJob` y la preferencia al monto del fee
4. Simplificar `completeJob` y el ledger
5. Ajustar las pantallas de `/pro/cobros` y `/admin/comisiones`
6. Actualizar los tests de `tests/payments.test.ts` y `tests/integration/payments.test.ts`
