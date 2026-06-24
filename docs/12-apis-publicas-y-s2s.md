# 1.12 — APIs públicas y S2S de lectura (Shipping App)

> **Tipo C — Marketplace · BiciMarket · Shipping App**
> Spec completa de los endpoints de **solo lectura** que Shipping expone a:
> - **Otras apps del marketplace** (Buyer, Seller) — requieren `X-Service-Token`.
> - **Cualquier persona en internet** (compradores siguiendo un envío) — sin auth.
>
> Para los endpoints transaccionales (POST/PATCH para crear shipments, marcar entregas, etc.) ver `03-apis.md`. Esta doc complementa la canónica con los endpoints "consultables" que sumamos después de la implementación inicial.

---

## Resumen

| Endpoint | Auth | Quién lo consume |
|---|---|---|
| `GET /api/v1/postal-codes` | Público | Buyer App (selectores), cualquier app del grupo, frontend de Shipping |
| `GET /api/v1/quote-preview` | S2S (`X-Service-Token`) | Buyer App (preview de precio en checkout) |
| `GET /api/v1/track/{code}` | Público | Comprador anónimo siguiendo su envío |

Todos devuelven JSON con el formato canónico de error documentado en `03-apis.md §0.3`.

Verificado con `curl` en localhost:3000 (Next 16 + Prisma + Supabase). Las respuestas que aparecen abajo son **reales del entorno dev**.

---

## 1. Dataset de códigos postales

### `GET /api/v1/postal-codes`

Devuelve la lista de CPs argentinos que el sistema conoce (~230 entradas: CABA por barrio, AMBA completo, capitales provinciales, costa atlántica, Bahía Blanca y proximidades, Patagonia).

**Auth**: ninguna (público). Sin rate-limit por ahora.

**Source de verdad**: dataset embebido en `src/lib/geo/ar-postal-codes.ts`. Si una app del grupo necesita un CP que no está, sumarlo allí — los endpoints `/quote-preview`, `/shipping-quotes` y `/admin/shipments` lo van a empezar a aceptar inmediatamente.

#### Query params (opcionales)

| Param | Tipo | Qué hace |
|---|---|---|
| `q` | string | Match case-insensitive en `cp`, `city` o `province` |
| `province` | string | Match case-insensitive en `province` (filtro fino) |

Sin params → devuelve todo el dataset ordenado por provincia → ciudad.

#### Response 200

```json
{
  "data": [
    {
      "cp": "B8000",
      "lat": -38.7196,
      "lng": -62.2724,
      "city": "Bahía Blanca",
      "province": "Buenos Aires"
    },
    {
      "cp": "B8001",
      "lat": -38.718,
      "lng": -62.264,
      "city": "Bahía Blanca Centro",
      "province": "Buenos Aires"
    }
  ],
  "total": 3
}
```

#### Ejemplos curl

```bash
# Todos
curl http://localhost:3000/api/v1/postal-codes

# Buscar "mar" → 11 matches (Mar del Plata, Pinamar, Miramar, etc.)
curl "http://localhost:3000/api/v1/postal-codes?q=mar"

# Buscar "bah" → 3 matches (Bahía Blanca + barrios)
curl "http://localhost:3000/api/v1/postal-codes?q=bah"

# Solo CPs de Córdoba
curl "http://localhost:3000/api/v1/postal-codes?province=Córdoba"
```

#### Respuesta real (verificada)

```
GET /api/v1/postal-codes?q=bah
→ 200 OK
{
  "data":[
    {"cp":"B8000","lat":-38.7196,"lng":-62.2724,"city":"Bahía Blanca","province":"Buenos Aires"},
    {"cp":"B8001","lat":-38.718,"lng":-62.264,"city":"Bahía Blanca Centro","province":"Buenos Aires"},
    {"cp":"B8003","lat":-38.735,"lng":-62.254,"city":"Bahía Blanca Norte","province":"Buenos Aires"}
  ],
  "total":3
}
```

---

## 2. Preview de precio (sin persistir)

### `GET /api/v1/quote-preview`

Calcula el costo de un envío para una combinación específica de origen, destino, peso y service level **sin persistir nada**. Útil para que Buyer App muestre el precio en vivo mientras el usuario edita el carrito.

Si la cotización va a derivar en un shipment real, usar **`POST /api/v1/shipping-quotes`** (persiste con TTL 60min y devuelve `quote_id` que Seller necesita después al crear el shipment).

**Auth**: `X-Service-Token: <secret>` — el secret del par Buyer↔Shipping (`INCOMING_SERVICE_TOKEN` en el `.env` de Shipping, lo mismo que `SHIPPING_SERVICE_TOKEN` en el `.env` de Buyer).

**Motor de matching**: `src/lib/quote-engine.ts:findMatchingRate()`. Aplica:
1. Calcula la distancia entre CPs con Haversine sobre el dataset de CPs.
2. Busca la fila en `shipping_rates` que matchee `distance_km × weight_grams × service_level`, donde `active=true`. Si hay múltiples matches, elige la más barata.

#### Query params (todos requeridos)

| Param | Tipo | Validación |
|---|---|---|
| `pickup_postal_code` | string | Debe estar en el dataset (`src/lib/geo/ar-postal-codes.ts`) |
| `shipping_postal_code` | string | Idem |
| `weight_grams` | int positivo | Suma total del envío |
| `service_level` | enum | `"standard" \| "express" \| "same_day"` |

#### Response 200

```json
{
  "cost_cents": 3456000,
  "currency": "ARS",
  "carrier": "andreani",
  "service_level": "express",
  "distance_km": 643,
  "weight_grams_total": 5000,
  "estimated_days_min": 1,
  "estimated_days_max": 2
}
```

#### Errores

| HTTP | Code | Cuándo |
|---|---|---|
| 400 | `BAD_REQUEST` | Faltan/inválidos query params. `details.issues` trae los issues de zod. |
| 401 | `UNAUTHORIZED` | Falta o es inválido el `X-Service-Token`. |
| 422 | `POSTAL_CODE_UNKNOWN` | Alguno de los CPs no está en el dataset. `details: { pickup_postal_code, shipping_postal_code }`. |
| 422 | `RATE_NOT_FOUND` | Los CPs son válidos pero no hay tarifa configurada para esa combinación de distancia/peso/service. Caso típico: pedir `same_day` para >150km (las filas están seedeadas como `active=false`). |

#### Ejemplos curl

```bash
# Caso A: corta distancia (Caballito → Belgrano)
curl "http://localhost:3000/api/v1/quote-preview?pickup_postal_code=C1406&shipping_postal_code=C1428&weight_grams=3000&service_level=standard" \
  -H "X-Service-Token: <INCOMING_SERVICE_TOKEN>"

# Caso B: larga distancia express (CABA → Córdoba)
curl "http://localhost:3000/api/v1/quote-preview?pickup_postal_code=C1406&shipping_postal_code=X5000&weight_grams=5000&service_level=express" \
  -H "X-Service-Token: <INCOMING_SERVICE_TOKEN>"

# Caso C: peso alto (CABA → Bahía Blanca, 12kg)
curl "http://localhost:3000/api/v1/quote-preview?pickup_postal_code=C1406&shipping_postal_code=B8000&weight_grams=12000&service_level=standard" \
  -H "X-Service-Token: <INCOMING_SERVICE_TOKEN>"
```

#### Respuestas reales (verificadas)

```
Caso A → 7 km, $4.500 standard, 3-5 días:
{"cost_cents":450000,"currency":"ARS","carrier":"andreani","service_level":"standard","distance_km":7,"weight_grams_total":3000,"estimated_days_min":3,"estimated_days_max":5}

Caso B → 643 km, $34.560 express, 1-2 días:
{"cost_cents":3456000,"currency":"ARS","carrier":"andreani","service_level":"express","distance_km":643,"weight_grams_total":5000,"estimated_days_min":1,"estimated_days_max":2}

Caso C → 570 km, $42.000 standard (12kg multiplica), 3-5 días:
{"cost_cents":4200000,"currency":"ARS","carrier":"andreani","service_level":"standard","distance_km":570,"weight_grams_total":12000,"estimated_days_min":3,"estimated_days_max":5}
```

#### Errores reales (verificados)

```
Sin token:
HTTP 401 → {"error":{"code":"UNAUTHORIZED","message":"X-Service-Token inválido o ausente"}}

CP no listado (Z9999):
HTTP 422 → {"error":{"code":"POSTAL_CODE_UNKNOWN","message":"No contamos con envíos al destino que ingresaste.","details":{"pickup_postal_code":"Z9999","shipping_postal_code":"X5000"}}}

same_day a 643km (la fila está seedeada como inactive):
HTTP 422 → {"error":{"code":"RATE_NOT_FOUND","message":"No hay tarifa disponible para esos parámetros","details":{"weight_grams":3000,"service_level":"same_day"}}}
```

#### Diferencia entre `quote-preview` y `shipping-quotes`

| | `GET /quote-preview` | `POST /shipping-quotes` |
|---|---|---|
| Persiste en DB | ❌ | ✅ (60 min TTL) |
| Auth | S2S | S2S |
| Inputs | CPs directos | `seller_profile_id` + `to.postal_code` (Shipping resuelve la pickup_address) |
| Devuelve `quote_id` | ❌ | ✅ |
| Idempotency | No aplica | `Idempotency-Key` header opcional |
| Buyer App lo usa para... | Mostrar precio en vivo | Reservar el precio al confirmar checkout |

---

## 3. Tracking público de un envío

### `GET /api/v1/track/{code}`

Devuelve el estado completo de un envío para que cualquier persona pueda hacer seguimiento sin estar logueado. Es el endpoint que respalda la pantalla pública `/track/[code]`.

**Auth**: ninguna (público). El operador anónimo necesita conocer el `tracking_number` o el `shipment_id` (los compartis vos al comprador).

**`code` acepta ambos formatos**:
- `shp_…` (el ID interno del shipment)
- `TRK-AR-…` (el tracking number, formato 8 dígitos numéricos)

#### Response 200

```json
{
  "tracking_number": "TRK-AR-25026163",
  "shipment_id": "shp_c5afa24deec94792aa87c362",
  "status": "delivered",
  "carrier": "andreani",
  "service_level": "standard",
  "origin": {
    "city": "Bahía Blanca",
    "province": "Buenos Aires",
    "postal_code": "B8000"
  },
  "destination": {
    "city": "Bolívar",
    "province": "Buenos Aires",
    "postal_code": "B6300"
  },
  "weight_grams_total": 5000,
  "packages_count": 1,
  "created_at": "2026-05-26T18:32:37.844Z",
  "shipped_at": null,
  "delivered_at": "2026-05-26T19:14:39.180Z",
  "events": [
    { "event_type": "created",           "location": null, "note": null,   "occurred_at": "..." },
    { "event_type": "ready_for_pickup",  "location": null, "note": null,   "occurred_at": "..." },
    { "event_type": "picked_up",         "location": null, "note": null,   "occurred_at": "..." },
    { "event_type": "in_transit",        "location": null, "note": null,   "occurred_at": "..." },
    { "event_type": "out_for_delivery",  "location": null, "note": null,   "occurred_at": "..." },
    { "event_type": "delivered",         "location": null, "note": "lleog", "occurred_at": "..." }
  ],
  "proof": {
    "photo_url": "https://pxyfzgcpfsypxqosemuy.supabase.co/storage/v1/object/public/delivery-proofs/<uuid>.png",
    "note": "lleog",
    "delivered_at": "2026-05-26T19:14:39.180Z"
  }
}
```

El campo `proof` solo aparece si el envío ya fue marcado como `delivered`.

#### Errores

| HTTP | Code | Cuándo |
|---|---|---|
| 400 | `BAD_REQUEST` | El `code` viene vacío. |
| 404 | `TRACKING_NOT_FOUND` | No se encontró un shipment con ese `tracking_number` o `id`. |

#### Datos que NO se exponen

El DTO público omite intencionalmente:
- `clerk_user_id` del operador asignado.
- Calle/número exactos de pickup/shipping (solo `city`, `province`, `postal_code`).
- `cost_cents` del envío.
- `order_id`, `sales_order_id`, `buyer_profile_id`, `seller_profile_id` (refs opacas a otras apps).

#### Ejemplos curl

```bash
# Por tracking number
curl http://localhost:3000/api/v1/track/TRK-AR-25026163

# Por shipment id
curl http://localhost:3000/api/v1/track/shp_c5afa24deec94792aa87c362

# Código inexistente
curl http://localhost:3000/api/v1/track/TRK-AR-00000000
# → HTTP 404 {"error":{"code":"TRACKING_NOT_FOUND","message":"No encontramos un envío con ese código"}}
```

---

## 4. Lo que (todavía) no expusimos

Endpoints que potencialmente podrían sumar las otras apps del grupo pero que **no creamos** porque no están claramente en el alcance de sprint 1:

| Endpoint hipotético | Caso de uso | Por qué no lo hicimos |
|---|---|---|
| `GET /api/v1/shipping-rates` público | Que Buyer muestre la grilla completa de tarifas como referencia | El endpoint existe pero requiere JWT admin. Si una app del grupo lo necesita, abrir un PR para sumar variante S2S read-only. |
| `GET /api/v1/seller-profile/{id}/shipments` | Que Seller App liste sus propios envíos | No está en docs/03 — Seller actualmente consulta por `sales_order_id` en su propia DB. Si se sumara, sería un S2S. |
| `GET /api/v1/track/{code}/events` | Eventos paginados separados del DTO | El DTO actual ya trae los eventos inline; si en algún envío crecen mucho se podría paginar. |
| Webhook al pasar a `delivered` | Notificación push a Buyer/Seller | Por ADR-002 las llamadas salientes están diferidas en sprint 1 (logs `outbound-deferred`). Sprint 2 reactiva con `callServiceApi`. |

Estos están listos para sumar cuando algún consumer los reclame.

---

## 5. Tokens compartidos

Cada app del marketplace mantiene su propio `INCOMING_SERVICE_TOKEN` (rotable, en `.env`, nunca commiteado). Las otras apps lo guardan como `SHIPPING_SERVICE_TOKEN` y lo usan al llamar.

```
Shipping → .env → INCOMING_SERVICE_TOKEN=<X>
Buyer    → .env → SHIPPING_SERVICE_TOKEN=<X>  (mismo valor)
Seller   → .env → SHIPPING_SERVICE_TOKEN=<X>  (mismo valor)
```

Para coordinar la rotación, los devs del grupo se pasan el token nuevo por un canal seguro (no por Slack/email).

El helper `src/lib/service-auth.ts:callServiceApi()` del template ya lee el token correcto de las env vars al hacer outbound — no hay que hardcodear nada.

---

## 6. Cliente JS de referencia (Buyer/Seller)

Snippet copy-paste para usar desde el backend de otra app del grupo:

```ts
// En Buyer App
import { callServiceApi } from "@/lib/service-auth";

// Preview de precio en vivo
const previewRes = await callServiceApi(
  "shipping",
  `/api/v1/quote-preview?pickup_postal_code=${cpFrom}&shipping_postal_code=${cpTo}&weight_grams=${weight}&service_level=${service}`,
  { method: "GET" },
);
if (previewRes.ok) {
  const preview = await previewRes.json();
  // preview.cost_cents, preview.distance_km, preview.estimated_days_min, ...
}

// Cuando el usuario confirma checkout — persiste con TTL 60min
const quoteRes = await callServiceApi(
  "shipping",
  "/api/v1/shipping-quotes",
  {
    method: "POST",
    body: { from: { seller_profile_id }, to, packages, service_level },
    idempotencyKey: orderId,
  },
);
const quote = await quoteRes.json();
// quote.id → guardar en la orden + pasar a Seller al crear el shipment

// Listado de CPs para poblar selector (cliente)
const cpsRes = await fetch("https://shipping.bicimarket.com/api/v1/postal-codes");
const cps = await cpsRes.json();
// cps.data → lista para el combobox
```

---

Última actualización: verificado contra el dev server local con los curls de arriba.
