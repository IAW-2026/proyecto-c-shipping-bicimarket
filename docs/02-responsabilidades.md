# 1.2 — Asignación de Responsabilidades (Shipping App)

> **Tipo C — Marketplace · BiciMarket · Shipping App**
> Copia local recortada. Solo se conservan las **reglas transversales del sistema**, la **sección de Shipping** y los **contratos que tocan a Shipping**. Documentación completa en `proyecto-c-etapa-1-bicimarket/docs/`.

---

## 1. Distribución

| App | Responsable | Repositorio | Clerk propio |
|---|---|---|---|
| **Shipping App** | **Enrique Seitz** | https://github.com/Enry6tz/proyecto-c-shipping-enriqueseitz | Sí (`shipping.bicimarket`) |
| Buyer App | Camila Rojas Fritz | https://github.com/camilarojasfritz/proyecto-c-buyer-camilarojas | Sí (`buyer.bicimarket`) |
| Seller App | Pierino Spina | `proyecto-c-seller-spina` | Sí (`seller.bicimarket`) |
| Payments App | Rocco Paoloni | https://github.com/roccopaoloni/proyecto-c-payments-roccopaoloni | Sí (`payments.bicimarket`), solo admins |

---

## 2. Reglas transversales (obligatorias para todas las apps)

> **Restricción del proyecto — stock ilimitado**: ninguna app maneja stock real. Ver `01-descripcion.md §1.1`.

1. **Versionado**: endpoints bajo `/api/v1/...`.
2. **Autenticación**:
   - `Authorization: Bearer <JWT>` para llamadas hechas por la UI propia, validadas contra el Clerk de **esa misma app**.
   - `X-Service-Token: <secret>` para llamadas server-to-server entre apps. Cada par origen→destino tiene su propio secret rotable.
   - **No hay HMAC ni firmas internas**. La única firma que validamos es la de Mercado Pago en su webhook (`MERCADOPAGO_WEBHOOK_SECRET`).
3. **Formato de error**: `{ "error": { "code": "...", "message": "...", "details": {} } }` con HTTP status apropiado. Códigos en `SCREAMING_SNAKE_CASE`.
4. **Paginación**: GET de listado devuelve `{ "data": [...], "pagination": { "total": N, "page": 1, "limit": 20, "has_more": true } }`. Default `limit=20`, máximo `limit=100`.
5. **Idempotencia**: todo `POST` que crea recursos acepta header `Idempotency-Key`. Si llega un retry con la misma key, devuelve la misma response sin duplicar.
6. **Snapshots de datos cruzados**: cuando una app guarda datos cuya fuente de verdad está en otra (precio, nombre, dirección), guarda **snapshot al momento de la transacción**. Nunca consulta "en vivo" para mostrar histórico.
7. **Notificaciones inter-apps**: son llamadas REST normales (`POST`/`PATCH`). Si fallan con 5xx o timeout, el emisor reintenta hasta 3 veces con backoff lineal (1s, 3s, 9s). No hay cola persistente.
8. **Logs y trazabilidad**: cada request inter-app lleva `X-Request-Id: <uuid>` que se propaga en cadena.
9. **Multi-vendedor**: una orden puede contener productos de varios vendedores. Shipping App siempre maneja **un `shipment` por seller** (independientes).

---

## 3. Shipping App

### 3.1 Datos propios (DB de Shipping App)
- `logistics_operators` — operadores propios o tercerizados.
- `shipping_rates` — tarifario por peso/zona.
- `shipping_quotes` — cotizaciones emitidas con TTL de 60 minutos.
- `shipments` — **fuente de verdad de `shipment_id`**, peso total, costo final, status.
- `packages` — bultos del envío con `weight_grams`, `length_cm`, `width_cm`, `height_cm`, `label_url`.
- `tracking_events` — historial de eventos.
- `delivery_assignments` — asignación operador↔envío.
- `delivery_proofs` — fotos, firmas, notas en entrega.
- `shipment_status_history` — auditoría de cambios de status.

### 3.2 Compromisos públicos

La Shipping App **se compromete a**:

- Cotizar envíos con `POST /shipping-quotes` devolviendo costo, días estimados, peso total y bultos. La cotización vive 60 minutos vía `quote_id`.
- Crear `shipments` cuando Seller App lo solicita post-pago.
- Permitir al operador logístico ver sus asignaciones y registrar eventos.
- Notificar a Buyer y Seller cada cambio relevante de estado con un `PATCH` REST.
- Notificar a Payments con un `POST` REST cuando un envío llega a `delivered` (gatilla la liquidación).
- Validar prueba de entrega (foto; firma opcional) antes de pasar a `delivered`.

### 3.3 Compromisos NO asumidos

- **No procesa cobros del envío**. Reporta el `cost`; el cobro lo agrega Buyer App al total y lo cobra Payments.
- **No conoce el monto de la orden**.

### 3.4 Lo que consume (llamadas salientes)

| Consume de | Para qué | Endpoint |
|---|---|---|
| Seller App | Validar `seller_profile_id` y dirección de retiro | `GET /api/v1/seller-profile/{id}/pickup-address` |
| Buyer App | Notificar cambio de estado de envío | `PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping` |
| Seller App | Notificar cambio de estado de envío | `PATCH /api/v1/sales-orders/{id}/shipping-status` |
| Payments App | Gatillar liquidación al delivered | `POST /api/v1/internal/shipment-delivered` |

> **Sprint 1 (ADR-002)**: las 4 llamadas salientes están diferidas — se reemplazan por logs `outbound-deferred`. Se reactivan en sprint 2 (ver tickets `sprint-2/`).

### 3.5 Lo que recibe (REST entrante de otras apps)

| De | Endpoint | Acción |
|---|---|---|
| Buyer App | `POST /api/v1/shipping-quotes` | Cotiza. |
| Buyer App | `GET /api/v1/shipments?orderId=X` | Consulta. |
| Buyer App | `GET /api/v1/shipments/{id}/tracking-events` | Tracking público. |
| Seller App | `POST /api/v1/shipments` | Crea envío. |
| Seller App | `POST /api/v1/shipments/{id}/packages` | Agrega paquete a un shipment. |

---

## 4. Mecanismo de comunicación inter-apps (normativo)

> Regla del proyecto: **solo REST clásico sobre HTTP** (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Sin colas, sin event bus, sin webhooks entre nuestras apps, sin firmas HMAC. La única excepción es el webhook que Mercado Pago manda a Payments — porque MP es externo y no se negocia con él.

| Tipo | Cuándo | Headers obligatorios | Auth | Retry |
|---|---|---|---|---|
| **REST usuario → app propia** | UI llama a su backend | `Authorization: Bearer <JWT>` | JWT validado contra Clerk de la misma app | No (lo maneja el cliente) |
| **REST app → app** | Cualquier comunicación interna entre apps | `X-Service-Token: <secret>`, `X-Request-Id: <uuid>` | Secret compartido del par origen→destino | 3 reintentos con timeout 5s, backoff lineal 1s/3s/9s |
| **Webhook MP → Payments** | Cambio de pago en MP (único webhook del sistema) | Firma de MP (`x-signature`) | `MERCADOPAGO_WEBHOOK_SECRET` | Lo maneja MP |

Cada par de apps mantiene un secreto compartido (`<APPA>_TO_<APPB>_SERVICE_TOKEN`), rotable, almacenado en env vars de cada app, **nunca commiteado**.

---

## 5. Tabla maestra de comunicación (filas que tocan Shipping)

| App origen | Acción | App destino | Método | Endpoint |
|---|---|---|---|---|
| Buyer | Cotizar envío por seller-group | Shipping | `POST` | `/api/v1/shipping-quotes` |
| Buyer | Consultar tracking | Shipping | `GET` | `/api/v1/shipments?orderId=X` |
| Seller | Crear envío | Shipping | `POST` | `/api/v1/shipments` |
| Seller | Agregar paquete | Shipping | `POST` | `/api/v1/shipments/{id}/packages` |
| Shipping | Hidratar pickup_address | Seller | `GET` | `/api/v1/seller-profile/{id}/pickup-address` |
| Shipping | Cambio de envío | Buyer | `PATCH` | `/api/v1/orders/{id}/seller-groups/{g}/shipping` |
| Shipping | Cambio de envío | Seller | `PATCH` | `/api/v1/sales-orders/{id}/shipping-status` |
| Shipping | Entregado | Payments | `POST` | `/api/v1/internal/shipment-delivered` |