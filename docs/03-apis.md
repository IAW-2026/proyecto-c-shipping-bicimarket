# 1.3 — Diseño de APIs (Shipping App)

> **Tipo C — Marketplace · BiciMarket · Shipping App**
> Copia local recortada. Contiene:
> - §0: convenciones globales del sistema (aplicables a toda app).
> - **Shipping App SH1–SH5**: API completa que Shipping expone.
> - **Contratos referenciados (CR1–CR4)**: endpoints de otras apps que Shipping consume o notifica.
>
> La especificación completa de las 4 apps vive en `proyecto-c-etapa-1-bicimarket/docs/`.

---

## 0. Convenciones globales

> **Regla**: solo REST clásico sobre HTTP. Métodos permitidos: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. No hay webhooks entre nuestras apps; el único webhook real del sistema es el de Mercado Pago en `/webhooks/mercadopago` (lo recibe Payments, no Shipping).

### 0.1 Base path y versionado
- Toda API vive bajo `/api/v1/...`.
- Cambios incompatibles → `/api/v2/...`. Coexisten al menos un sprint.

### 0.2 Headers obligatorios

| Header | Aplica a | Valor |
|---|---|---|
| `Content-Type` | POST/PATCH/PUT con body | `application/json` (o `multipart/form-data` para uploads) |
| `Authorization` | Llamadas desde la UI propia | `Bearer <JWT-de-Clerk-de-la-app>` |
| `X-Service-Token` | Llamadas server-to-server entre apps | secret rotable del par origen→destino |
| `X-Request-Id` | Toda llamada inter-app | UUID que se propaga en cadena |
| `Idempotency-Key` | POST que crea recursos | UUID elegido por el cliente |

### 0.3 Formato de error

```json
{
  "error": {
    "code": "QUOTE_EXPIRED",
    "message": "La cotización qte_01H… expiró el 2026-04-25T15:32:00Z",
    "details": { "quote_id": "qte_01H…", "expires_at": "2026-04-25T15:32:00Z" }
  }
}
```

| HTTP | Cuándo |
|---|---|
| 400 `BAD_REQUEST` | Payload inválido sintácticamente. |
| 401 `UNAUTHORIZED` | JWT/Service Token inválido o ausente. |
| 403 `FORBIDDEN` | Auth válido pero sin permiso. |
| 404 `NOT_FOUND` | Recurso inexistente. |
| 409 `CONFLICT` | Estado inválido para esa transición (ej `INVALID_TRANSITION`, `QUOTE_EXPIRED`, `SHIPMENT_ALREADY_EXISTS`). |
| 422 `UNPROCESSABLE_ENTITY` | Validación de negocio falla. |
| 429 `RATE_LIMITED` | Demasiadas requests. |
| 500 `INTERNAL` | Error del servidor. |
| 502 `UPSTREAM_ERROR` | Falla al llamar a otra app. |

### 0.4 Paginación estándar

Querystring: `?page=1&limit=20&sort=-created_at&q=...`.

```json
{
  "data": [ /* ... */ ],
  "pagination": { "total": 134, "page": 1, "limit": 20, "has_more": true, "next_cursor": null }
}
```

### 0.5 IDs

Strings con prefijo del recurso (estilo Stripe). Prefijos propios de Shipping: `shp_…`, `qte_…`, `pkg_…`, `evt_…`, `dla_…`, `prf_…`, `lop_…`, `rat_…`, `ssh_…`. Refs opacas a otras apps que Shipping persiste: `ord_…`, `osg_…`, `sor_…`, `slp_…`, `byp_…`, `pay_…`. Internamente CUID/ULID, no auto-increment.

### 0.6 Timestamps

ISO 8601 UTC: `2026-04-25T14:32:00Z`.

### 0.7 Moneda y montos

Montos en **centavos** como entero (`amount_cents: 1599900` = ARS 15.999,00). Currency siempre `"ARS"`.

---

# Shipping App — `https://shipping.bicimarket.com`

Owner: Enrique Seitz. Clerk: `shipping.bicimarket`.

## SH1. Cotizaciones

### `POST /api/v1/shipping-quotes`
Lo llama Buyer App durante el checkout. **Desde ADR-005** el endpoint acepta siempre `pickups: [...]` (N>=1). Una sola llamada cotiza toda la orden — Buyer ya no llama N veces por `seller_group`. Para `N=1` el descuento es 0; para `N>=2` se aplica `discount = min(0.20, 0.05 × (N - 1))` y se distribuye por tramo.

**Auth**: `X-Service-Token` (S2S desde Buyer).

**Request**
```json
{
  "pickups": [
    {
      "seller_profile_id": "slp_01H…",
      "packages": [
        { "weight_grams": 14500, "length_cm": 180, "width_cm": 60, "height_cm": 110 }
      ]
    },
    {
      "seller_profile_id": "slp_02H…",
      "packages": [
        { "weight_grams": 750, "length_cm": 70, "width_cm": 70, "height_cm": 10 }
      ]
    }
  ],
  "to": {
    "city": "CABA",
    "province": "Buenos Aires",
    "postal_code": "C1043",
    "country": "AR"
  },
  "service_level": "standard"
}
```
`service_level`: `standard` | `express` | `same_day`.

**Response 201**
```json
{
  "origins_count": 2,
  "discount_pct": 0.05,
  "total_gross_cents": 1800000,
  "total_net_cents": 1710000,
  "currency": "ARS",
  "quotes": [
    {
      "id": "qte_01H…",
      "seller_profile_id": "slp_01H…",
      "service_level": "standard",
      "carrier": "andreani",
      "cost_cents": 1140000,
      "currency": "ARS",
      "estimated_days_min": 3,
      "estimated_days_max": 5,
      "weight_grams_total": 14500,
      "packages_count": 1,
      "expires_at": "2026-04-25T15:32:00Z"
    },
    {
      "id": "qte_02H…",
      "seller_profile_id": "slp_02H…",
      "service_level": "standard",
      "carrier": "andreani",
      "cost_cents": 570000,
      "currency": "ARS",
      "estimated_days_min": 3,
      "estimated_days_max": 5,
      "weight_grams_total": 750,
      "packages_count": 1,
      "expires_at": "2026-04-25T15:32:00Z"
    }
  ]
}
```

Buyer App usa cada `quote_id` al crear los shipments correspondientes (uno por seller via SH2). Cuando es single-origen, `quotes` tiene un elemento, `discount_pct = 0` y `total_gross_cents === total_net_cents`. `expires_at` = ahora + 60 minutos, compartido entre las N quotes.

**Errores**:
- `422 POSTAL_CODE_UNKNOWN` con `details: { postal_code }` cuando el destino o un origen no está en el dataset.
- `422 RATE_NOT_FOUND` con `details: { seller_profile_id, postal_code }` cuando algún origen no matchea una tarifa.

**Idempotencia**: con `Idempotency-Key: K`, las N quotes se persisten con clave `${K}:${idx}` y el endpoint las recupera por prefijo en POST repetidos.

> **Sprint 1 (ADR-002)**: la hidratación de `pickup_address` desde Seller está mockeada en `lib/mocks.ts`. Ver §CR1 para el contrato real.

---

## SH2. Envíos

### `POST /api/v1/shipments`
S2S, lo llama Seller. Soporta `Idempotency-Key`.

**Auth**: `X-Service-Token`.

**Request**
```json
{
  "shipping_quote_id": "qte_01H…",
  "order_id": "ord_01H…",
  "order_seller_group_id": "osg_01H…",
  "sales_order_id": "sor_01H…",
  "seller_profile_id": "slp_01H…",
  "buyer_profile_id": "byp_01H…",
  "shipping_address_snapshot": {
    "street": "Av. Corrientes", "number": "1234",
    "city": "CABA", "province": "Buenos Aires",
    "postal_code": "C1043", "country": "AR"
  },
  "packages": [
    {
      "weight_grams": 14500, "length_cm": 180, "width_cm": 60, "height_cm": 110,
      "description": "Bicicleta Trek Marlin 5"
    }
  ]
}
```

**Response 201**
```json
{
  "id": "shp_01H…",
  "order_id": "ord_01H…",
  "order_seller_group_id": "osg_01H…",
  "sales_order_id": "sor_01H…",
  "seller_profile_id": "slp_01H…",
  "buyer_profile_id": "byp_01H…",
  "carrier": "andreani",
  "service_level": "standard",
  "tracking_number": "TRK-AR-789",
  "label_url": "https://cdn.bicimarket.com/labels/shp_01H….pdf",
  "status": "ready_for_pickup",
  "weight_grams_total": 14500,
  "cost_cents": 1200000,
  "currency": "ARS",
  "packages": [
    {
      "id": "pkg_01H…", "weight_grams": 14500, "length_cm": 180,
      "width_cm": 60, "height_cm": 110,
      "description": "Bicicleta Trek Marlin 5",
      "label_url": "https://cdn.bicimarket.com/labels/pkg_01H….pdf"
    }
  ],
  "created_at": "2026-04-25T14:40:00Z"
}
```

**Errores**:
- `409 QUOTE_EXPIRED`
- `409 SHIPMENT_ALREADY_EXISTS` con `details: { existing_shipment_id }`

> **Sprint 1**: `label_url` apunta a un PDF placeholder estático en `/public/labels/sample.pdf`. `tracking_number` se genera con helper `"TRK-AR-" + random8digits`.

### `GET /api/v1/shipments/{shipmentId}`
Auth: JWT (logistics/admin) o S2S. **Response 200**: igual al POST.

### `GET /api/v1/shipments?orderId=ord_01H…`
Auth: S2S (típicamente Buyer App). **Response 200**: lista paginada de shipments para una orden.

```json
{
  "data": [
    {
      "id": "shp_01H…",
      "order_id": "ord_01H…",
      "order_seller_group_id": "osg_01H…",
      "seller_profile_id": "slp_01H…",
      "tracking_number": "TRK-AR-789",
      "status": "in_transit"
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 20, "has_more": false }
}
```

### `PATCH /api/v1/shipments/{shipmentId}/status`
Para correcciones admin. **Auth**: rol `admin` o `logistics`.

**Request**: `{ "status": "in_transit", "note": "Demora por feriado" }`.
**Response 200**: shipment actualizado. (Recomputa el rollup del pedido.)

### `GET /api/v1/shipment-groups/{groupId}` — ADR-006
Vista GLOBAL del pedido (todos los vendedores + sus pickups). **Auth**: JWT admin u operador. `groupId` acepta el `grp_…` o el tracking global `BMK-…`.

**Response 200**: `ShipmentGroupDTO` (`order_id`, `aggregate` con `order_tracking_number`/`rollup_status`/`origins_count`/etc., y `shipments[]`).

> **ADR-006 — tracking global del pedido**: una orden con N vendedores se agrupa en un `shipment_group` (1 por `order_id`) dueño del tracking GLOBAL (`order_tracking_number`, formato `BMK-…`) — el ÚNICO que ve el comprador. Cada `shipment` conserva su `tracking_number` individual (`TRK-AR-…`), que ve solo su vendedor. El `ShipmentDTO` de SH2 incluye ambos: `tracking_number` (individual) y `order_tracking_number` (global del grupo). La asignación del operador es a nivel pedido (toma el grupo entero). Ver `docs/04 §3.1 shipment_groups` y `docs/06 §4`.

---

## SH3. Paquetes

### `POST /api/v1/shipments/{shipmentId}/packages`
**Auth**: S2S (Seller App).

**Request**
```json
{ "weight_grams": 750, "length_cm": 70, "width_cm": 70, "height_cm": 10, "description": "Cubierta Continental 29\"" }
```
**Response 201**: package creado. Recalcula `weight_grams_total` y `cost_cents` del shipment.

---

## SH4. Tracking events y delivery

### `POST /api/v1/shipments/{shipmentId}/tracking-events`
**Auth**: `logistics` (JWT) o `X-Service-Token` (carrier integration).

**Request**
```json
{
  "event_type": "in_transit",
  "location": "Centro de distribución Avellaneda",
  "note": "Salió hacia destino",
  "occurred_at": "2026-04-26T08:00:00Z"
}
```
`event_type`: `created` | `ready_for_pickup` | `picked_up` | `in_transit` | `out_for_delivery` | `delivered` | `failed_delivery` | `returned`.

**Response 201**: tracking_event creado.

Si el evento cambia el `status` del shipment, Shipping notifica:
- A Buyer: `PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping` (ver §CR2).
- A Seller: `PATCH /api/v1/sales-orders/{id}/shipping-status` (ver §CR3).

Las transiciones inválidas se rechazan con `409 INVALID_TRANSITION` y `details: { from, to, allowed }` (ver `06-estados-y-diagramas.md §3`).

> **Sprint 1 (ADR-002)**: notificaciones salientes diferidas; se reemplazan por `logger.info({ level: "outbound-deferred", target, payload })`.

### `GET /api/v1/shipments/{shipmentId}/tracking-events`
**Response 200**: lista paginada, orden cronológico.

```json
{
  "data": [
    { "id": "evt_01H…", "event_type": "created", "location": null, "note": "Etiqueta generada", "occurred_at": "2026-04-25T14:40:00Z" },
    { "id": "evt_02H…", "event_type": "picked_up", "location": "Caballito, CABA", "note": "Retiro OK", "occurred_at": "2026-04-26T07:30:00Z" }
  ],
  "pagination": { "total": 2, "page": 1, "limit": 20, "has_more": false }
}
```

### `POST /api/v1/shipments/{shipmentId}/deliver`
Atómico: crea `tracking_event=delivered` + `delivery_proof` + setea `shipment.status=delivered`.

**Auth**: `logistics` (JWT).

**Request**
```json
{
  "proof_photo_url": "https://cdn.bicimarket.com/proofs/shp_01H….jpg",
  "signature_image_url": "https://cdn.bicimarket.com/proofs/sign_shp_01H….png",
  "note": "Entregado al portero",
  "occurred_at": "2026-04-28T16:20:00Z"
}
```

> **Sprint 1**: la foto puede ir como `proof_photo_url = "data:image/jpeg;base64,…"` (base64 inline en la columna). Supabase Storage queda para sprint 2.

**Response 200**
```json
{
  "shipment_id": "shp_01H…",
  "status": "delivered",
  "delivered_at": "2026-04-28T16:20:00Z",
  "proof": {
    "photo_url": "…",
    "signature_url": "…",
    "note": "Entregado al portero"
  }
}
```

Tras el delivered, Shipping notifica:
- A Buyer: `PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping` (§CR2).
- A Seller: `PATCH /api/v1/sales-orders/{id}/shipping-status` (§CR3).
- A Payments: `POST /api/v1/internal/shipment-delivered` (§CR4 — gatilla settlement).

> **Sprint 1 (ADR-002)**: las 3 llamadas diferidas → logs `outbound-deferred`.

---

## SH5. Operadores logísticos y assignments

### `GET /api/v1/logistics-operators`
**Auth**: rol `admin`. **Response 200**: lista paginada.

### `POST /api/v1/logistics-operators`
**Auth**: rol `admin`.

**Request**
```json
{
  "clerk_user_id": "user_logistics_xyz",
  "full_name": "Juan Pérez",
  "phone": "+5491133333333",
  "email": "juan@logistica.com",
  "document_id": "30123456",
  "vehicle_type": "van",
  "license_plate": "AB123CD"
}
```
**Response 201**: operador creado.

### `GET /api/v1/my/assignments`
**Auth**: rol `logistics`. Devuelve los envíos asignados al operador logueado.

**Response 200**
```json
{
  "data": [
    {
      "id": "shp_01H…",
      "tracking_number": "TRK-AR-789",
      "status": "ready_for_pickup",
      "pickup_address": {
        "street": "Av. Rivadavia", "number": "9000",
        "city": "Caballito", "province": "Buenos Aires",
        "postal_code": "C1406", "country": "AR"
      },
      "shipping_address": {
        "street": "Av. Corrientes", "number": "1234",
        "city": "CABA", "province": "Buenos Aires",
        "postal_code": "C1043", "country": "AR"
      },
      "weight_grams_total": 14500,
      "packages_count": 1
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 20, "has_more": false }
}
```

### `POST /api/v1/shipments/{shipmentId}/assignments`
**Auth**: rol `admin`.
**Request**: `{ "operator_clerk_user_id": "user_logistics_xyz" }`.
**Response 201**: assignment creado.

### `PATCH /api/v1/shipments/{shipmentId}/assignments/{assignmentId}`
**Auth**: rol `admin`. **Request**: `{ "status": "reassigned", "operator_clerk_user_id": "user_other_xyz" }`. **Response 200**.

> **Sprint 1 (ADR-002)**: el CRUD completo de operadores + reasignaciones queda para sprint 2. Para el parcial alcanza con seed + un endpoint mínimo de alta + `GET /my/assignments`.

---

## SH6. Códigos postales (geo)

### `GET /api/v1/postal-codes`
Endpoint **PÚBLICO** (sin auth). Devuelve el dataset embebido de códigos postales argentinos con coordenadas (lat/lng), ciudad y provincia. Lo consume Buyer App para poblar los selectores de dirección con la misma lista que Shipping usa para cotizar (evita duplicar el dataset y cotizar CPs que Shipping no conoce → `422 POSTAL_CODE_UNKNOWN`). También lo usa el form de "nuevo pedido" del admin.

**Auth**: ninguna (público).

**Query params** (opcionales):
- `q` — filtro de texto; matchea por ciudad, código postal o provincia (case-insensitive).
- `province` — filtra por provincia (case-insensitive, substring).

**Response 200**
```json
{
  "data": [
    {
      "cp": "C1043",
      "lat": -34.6037,
      "lng": -58.4044,
      "city": "Almagro",
      "province": "Buenos Aires"
    }
  ],
  "total": 1
}
```

Sin paginación: la lista es chica (~230 entradas, <30KB) y se ordena por provincia y luego por ciudad. Las coordenadas alimentan el cálculo de distancia (Haversine) del motor de cotización (ver ADR-005 en `06`/`wiki`).

---

# Contratos referenciados (endpoints de OTRAS apps que Shipping toca)

> Estos endpoints **NO los implementa Shipping**; los implementan las apps respectivas. Acá quedan documentados los contratos porque Shipping los llama (o los llamará en sprint 2). Para el parcial (ADR-002), las llamadas salientes están reemplazadas por `logger.info({ level: "outbound-deferred", target, payload })` con el payload que se hubiera enviado.

## CR1. Hidratar dirección de retiro (vive en Seller App)

### `GET /api/v1/seller-profile/{sellerProfileId}/pickup-address`
**Auth**: `X-Service-Token` (Shipping → Seller).

**Response 200**
```json
{
  "seller_profile_id": "slp_01H…",
  "pickup_address": {
    "street": "Av. Rivadavia",
    "number": "9000",
    "city": "Caballito",
    "province": "Buenos Aires",
    "postal_code": "C1406",
    "country": "AR"
  }
}
```

> **Sprint 1**: mockeado en `lib/mocks.ts` con `getMockPickupAddress(sellerProfileId)`.

---

## CR2. Notificar cambio de envío a Buyer (vive en Buyer App)

### `PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/shipping`
**Auth**: `X-Service-Token` (Shipping → Buyer).

**Request**
```json
{
  "shipping_status": "in_transit",
  "shipment_id": "shp_01H…",
  "tracking_number": "BMK-1234567890",
  "occurred_at": "2026-04-26T08:10:00Z"
}
```
`shipping_status`: `ready_for_pickup` | `picked_up` | `in_transit` | `out_for_delivery` | `delivered` | `failed_delivery` | `returned`.

> **ADR-006**: `tracking_number` aquí es el tracking GLOBAL del pedido (`BMK-…`) — el que el comprador usa para seguir su pedido completo. CR3 (Seller) y CR4 (Payments) siguen siendo por `shipment`/`sales_order`/`order_seller_group` (la liquidación es por vendedor; no cambia).

**Response 200**: el seller_group actualizado.

---

## CR3. Notificar cambio de envío a Seller (vive en Seller App)

### `PATCH /api/v1/sales-orders/{salesOrderId}/shipping-status`
**Auth**: `X-Service-Token` (Shipping → Seller).

**Request**
```json
{
  "shipping_status": "delivered",
  "shipment_id": "shp_01H…",
  "occurred_at": "2026-04-28T16:20:00Z"
}
```
**Response 200**.

---

## CR4. Gatillar liquidación en Payments (vive en Payments App)

### `POST /api/v1/internal/shipment-delivered`
**Auth**: `X-Service-Token` (Shipping → Payments).

**Request**
```json
{
  "shipment_id": "shp_01H…",
  "order_id": "ord_01H…",
  "order_seller_group_id": "osg_01H…",
  "sales_order_id": "sor_01H…",
  "seller_profile_id": "slp_01H…",
  "delivered_at": "2026-04-28T16:20:00Z"
}
```

**Response 200**: `{ "received": true, "settlement_id": "set_01H…" }`.

---

# Notificaciones inter-apps (recordatorio normativo)

No usamos webhooks entre nuestras apps. Las notificaciones de cambio de estado son **llamadas REST normales** (`POST`/`PATCH`) autenticadas con `X-Service-Token`. El receptor responde 2xx. Si falla, el emisor reintenta hasta 3 veces (1s/3s/9s) — esto ya está implementado en `lib/service-auth.ts:callServiceApi`.

Headers de toda notificación inter-app saliendo de Shipping:

```
POST /endpoint-de-la-app-destino
Content-Type: application/json
X-Service-Token: <secret del par Shipping→destino>
X-Request-Id: <uuid>
User-Agent: bicimarket-shipping/1.0
```

El body es el del endpoint receptor (ver cada contrato), no un envelope genérico tipo "event".

---

# Secretos y service tokens (Shipping)

Shipping necesita estos secrets (rotables, en env vars, **nunca commiteados**):

```env
# Incoming (lo que las otras apps usan para llamarme)
INCOMING_SERVICE_TOKEN=…           # único token de Shipping (modelo simplificado del template).
                                    # Se comparte con Buyer y Seller para que me llamen.

# Outbound (lo que Shipping usa para llamar a otras apps) — SPRINT 2
SHIPPING_TO_BUYER_SERVICE_TOKEN=…
SHIPPING_TO_SELLER_SERVICE_TOKEN=…
SHIPPING_TO_PAYMENTS_SERVICE_TOKEN=…
```

> Para el sprint 1 (ADR-002), los `SHIPPING_TO_*` quedan vacíos. Se setean cuando se reactiva el outbound en sprint 2 y se coordinan tokens con compañeros del grupo (T08 en `tickets/sprint-2/`).