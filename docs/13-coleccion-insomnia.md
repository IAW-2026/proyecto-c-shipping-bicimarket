# 1.13 — Colección Insomnia / referencia tipo Swagger

> **Tipo C — Marketplace · BiciMarket · Shipping App**
> Catálogo completo de endpoints REST de Shipping App, agrupados por audiencia (Público / S2S / Operador / Admin) con method, path, auth y body de ejemplo. Al final hay un **JSON listo para importar a Insomnia** con todas las requests + un environment con variables.

---

## Cómo importar en Insomnia

1. Copiá el bloque JSON del final (entre los triple backticks `insomnia-export.json`).
2. Insomnia → Settings (engranaje) → **Data** → **Import Data** → **From Clipboard** (o pegá en un archivo `.json` y elegí "From File").
3. Va a aparecer un workspace **"Shipping App · BiciMarket"** con 4 folders y un environment **"Local"** con las variables precargadas.
4. Editá el environment para pegar tu `service_token` real (es el `INCOMING_SERVICE_TOKEN` de tu `.env`) y el `bearer_token` (saca uno de las dev tools del browser: `document.cookie` y busca `__session`, o configurá Clerk dev token).

---

## Referencia de endpoints

### Públicos (sin auth)

| Method | Path | Descripción |
|---|---|---|
| `GET` | `/api/health` | Healthcheck. Devuelve `{ ok: true }`. |
| `GET` | `/api/v1/postal-codes` | Dataset de CPs argentinos. Filtros opcionales `q`, `province`. |
| `GET` | `/api/v1/track/{code}` | Tracking público de un envío. Acepta `shp_…` o `TRK-AR-…`. |

### S2S — entre apps del marketplace (header `X-Service-Token`)

| Method | Path | Descripción |
|---|---|---|
| `GET` | `/api/v1/quote-preview` | Preview de precio sin persistir. Params: `pickup_postal_code`, `shipping_postal_code`, `weight_grams`, `service_level`. |
| `POST` | `/api/v1/shipping-quotes` | Crea quote persistida con TTL 60min. Body: `{ from, to, packages, service_level }`. |
| `POST` | `/api/v1/shipments` | Crea shipment a partir de una quote. Body completo (ver §SH2 de `03-apis.md`). |
| `GET` | `/api/v1/shipments?orderId=…` | Lista shipments por order. |
| `POST` | `/api/v1/shipments/{id}/packages` | Suma un paquete a un shipment existente. |
| `GET` | `/api/v1/shipments/{id}/tracking-events` | Eventos del shipment (S2S o JWT). |

### Operador (JWT Clerk con operador activo)

| Method | Path | Descripción |
|---|---|---|
| `GET` | `/api/v1/my/assignments` | Envíos asignados al operador + disponibles para auto-asignar. |
| `GET` | `/api/v1/my/operator` | Datos propios del operador. |
| `PATCH` | `/api/v1/my/operator` | Editar phone / DNI / vehicle / patente. |
| `POST` | `/api/v1/shipments/{id}/tracking-events` | Avanzar estado (picked_up, in_transit, out_for_delivery, failed_delivery). Auto-asign si está disponible. |
| `POST` | `/api/v1/shipments/{id}/deliver` | Confirmar entrega con `proof_photo_url`. |
| `POST` | `/api/v1/shipments/{id}/retry` | Reintentar el mismo envío: `failed_delivery → in_transit`. |
| `POST` | `/api/v1/uploads/delivery-proof` | Sube foto a Supabase Storage. Body: `multipart/form-data` con campo `file`. Devuelve `{ url, content_type, size }`. |

### Admin (JWT Clerk con `publicMetadata.admin=true`)

#### Envíos

| Method | Path | Descripción |
|---|---|---|
| `GET` | `/api/v1/shipments?…` | Listado con filtros, sort y paginación. |
| `GET` | `/api/v1/shipments/kpis` | KPIs: activos, entregados hoy, fallidos, devueltos. |
| `GET` | `/api/v1/shipments/{id}` | Detalle del shipment (también acepta S2S). |
| `PATCH` | `/api/v1/shipments/{id}` | Override manual de status. |
| `GET` | `/api/v1/shipments/{id}/status-history` | Historial de cambios de status (audit). |
| `GET` | `/api/v1/shipments/{id}/delivery-proof` | Prueba de entrega (foto + nota + timestamp). |
| `GET` | `/api/v1/shipments/{id}/assignments` | Lista de assignments con operador joineado. |
| `POST` | `/api/v1/shipments/{id}/assignments` | Asignar operador. |
| `PATCH` | `/api/v1/shipments/{id}/assignments/{aid}` | Reasignar. |
| `POST` | `/api/v1/admin/shipments` | DEV-only: crea quote+shipment+packages en una transacción. |

#### Operadores

| Method | Path | Descripción |
|---|---|---|
| `GET` | `/api/v1/logistics-operators?…` | Listado. `?detailed=1` incluye counts (active_assignments_count, delivered_30d, failed_30d). |
| `POST` | `/api/v1/logistics-operators` | Crear operador (invitar via Clerk primero, copiar `user_…`). |
| `GET` | `/api/v1/logistics-operators/{id}` | Detalle. |
| `PATCH` | `/api/v1/logistics-operators/{id}` | Editar / suspender / reactivar. |
| `GET` | `/api/v1/logistics-operators/{id}/performance` | Métricas 30 días. |
| `GET` | `/api/v1/logistics-operators/{id}/active-assignments` | Mini lista de envíos en curso. |
| `GET` | `/api/v1/logistics-operators/kpis` | KPIs: activos, suspendidos, assignments activos, avg/30d. |

#### Tarifaría

| Method | Path | Descripción |
|---|---|---|
| `GET` | `/api/v1/shipping-rates` | Lista completa. |
| `POST` | `/api/v1/shipping-rates` | Crear tarifa. |
| `PATCH` | `/api/v1/shipping-rates/{id}` | Editar / togglear `active`. |
| `DELETE` | `/api/v1/shipping-rates/{id}` | Borrar definitivamente. |

---

## Convenciones

- **Base URL** local: `http://localhost:3000`. Producción: `https://shipping.bicimarket.com` (TBD).
- **Auth de UI** (operador y admin): `Authorization: Bearer <jwt_clerk>`. En dev el navegador lo manda solo vía cookie, pero para Insomnia hay que setear el header manualmente.
- **Auth inter-apps**: header `X-Service-Token: <secret>`. El secret de Shipping es `INCOMING_SERVICE_TOKEN` del `.env`.
- **Idempotency**: POST que crea recursos acepta `Idempotency-Key: <uuid>` opcional.
- **Errores**: formato `{ error: { code, message, details? } }`. Ver `docs/03-apis.md §0.3` para la tabla completa de HTTP codes.
- **Centavos**: todos los montos en `cost_cents` son **enteros en centavos ARS** (`1200000` = $12.000,00).

---

## JSON para importar

Guardá esto como `shipping-app-insomnia.json` (o copialo al portapapeles) e impórtalo en Insomnia con **Data → Import → From File / From Clipboard**.

```insomnia-export.json
{
  "_type": "export",
  "__export_format": 4,
  "__export_date": "2026-05-26T20:00:00.000Z",
  "__export_source": "shipping-app.bicimarket:docs",
  "resources": [
    {
      "_id": "wrk_shipping_bicimarket",
      "_type": "workspace",
      "name": "Shipping App · BiciMarket",
      "description": "REST API de Shipping. Endpoints públicos, S2S, operador y admin.",
      "scope": "collection",
      "parentId": null
    },
    {
      "_id": "env_base",
      "_type": "environment",
      "name": "Base Environment",
      "data": {},
      "parentId": "wrk_shipping_bicimarket"
    },
    {
      "_id": "env_local",
      "_type": "environment",
      "name": "Local",
      "parentId": "env_base",
      "data": {
        "base_url": "http://localhost:3000",
        "service_token": "PEGAR_INCOMING_SERVICE_TOKEN_AQUI",
        "bearer_token": "PEGAR_JWT_CLERK_AQUI",
        "shipment_id": "shp_c5afa24deec94792aa87c362",
        "tracking_number": "TRK-AR-25026163",
        "operator_id": "lop_REEMPLAZAR",
        "rate_id": "rat_REEMPLAZAR",
        "assignment_id": "dla_REEMPLAZAR",
        "order_id": "ord_REEMPLAZAR"
      }
    },

    { "_id": "fld_public",   "_type": "request_group", "name": "1. Público (sin auth)",                      "parentId": "wrk_shipping_bicimarket", "metaSortKey": 1000 },
    { "_id": "fld_s2s",      "_type": "request_group", "name": "2. S2S (X-Service-Token)",                   "parentId": "wrk_shipping_bicimarket", "metaSortKey": 2000 },
    { "_id": "fld_operator", "_type": "request_group", "name": "3. Operador (JWT)",                          "parentId": "wrk_shipping_bicimarket", "metaSortKey": 3000 },
    { "_id": "fld_admin_sh", "_type": "request_group", "name": "4. Admin — Envíos (JWT admin)",              "parentId": "wrk_shipping_bicimarket", "metaSortKey": 4000 },
    { "_id": "fld_admin_op", "_type": "request_group", "name": "5. Admin — Operadores (JWT admin)",          "parentId": "wrk_shipping_bicimarket", "metaSortKey": 5000 },
    { "_id": "fld_admin_rt", "_type": "request_group", "name": "6. Admin — Tarifaría (JWT admin)",           "parentId": "wrk_shipping_bicimarket", "metaSortKey": 6000 },

    {
      "_id": "req_health",
      "_type": "request",
      "name": "GET health",
      "method": "GET",
      "url": "{{ _.base_url }}/api/health",
      "parentId": "fld_public",
      "metaSortKey": 100
    },
    {
      "_id": "req_postal_all",
      "_type": "request",
      "name": "GET postal codes (todos)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/postal-codes",
      "parentId": "fld_public",
      "metaSortKey": 200
    },
    {
      "_id": "req_postal_q",
      "_type": "request",
      "name": "GET postal codes (q=mar)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/postal-codes",
      "parentId": "fld_public",
      "parameters": [
        { "name": "q", "value": "mar" }
      ],
      "metaSortKey": 210
    },
    {
      "_id": "req_postal_prov",
      "_type": "request",
      "name": "GET postal codes (province=Córdoba)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/postal-codes",
      "parentId": "fld_public",
      "parameters": [
        { "name": "province", "value": "Córdoba" }
      ],
      "metaSortKey": 220
    },
    {
      "_id": "req_track_tn",
      "_type": "request",
      "name": "GET track (por tracking_number)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/track/{{ _.tracking_number }}",
      "parentId": "fld_public",
      "metaSortKey": 300
    },
    {
      "_id": "req_track_id",
      "_type": "request",
      "name": "GET track (por shipment_id)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/track/{{ _.shipment_id }}",
      "parentId": "fld_public",
      "metaSortKey": 310
    },

    {
      "_id": "req_quote_preview",
      "_type": "request",
      "name": "GET quote-preview (Caballito → Belgrano, 3kg, standard)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/quote-preview",
      "parentId": "fld_s2s",
      "parameters": [
        { "name": "pickup_postal_code",   "value": "C1406" },
        { "name": "shipping_postal_code", "value": "C1428" },
        { "name": "weight_grams",         "value": "3000" },
        { "name": "service_level",        "value": "standard" }
      ],
      "headers": [
        { "name": "X-Service-Token", "value": "{{ _.service_token }}" }
      ],
      "metaSortKey": 100
    },
    {
      "_id": "req_quote_preview_lejos",
      "_type": "request",
      "name": "GET quote-preview (CABA → Córdoba, 5kg, express)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/quote-preview",
      "parentId": "fld_s2s",
      "parameters": [
        { "name": "pickup_postal_code",   "value": "C1406" },
        { "name": "shipping_postal_code", "value": "X5000" },
        { "name": "weight_grams",         "value": "5000" },
        { "name": "service_level",        "value": "express" }
      ],
      "headers": [
        { "name": "X-Service-Token", "value": "{{ _.service_token }}" }
      ],
      "metaSortKey": 110
    },
    {
      "_id": "req_shipping_quote_post",
      "_type": "request",
      "name": "POST shipping-quotes (persiste)",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/shipping-quotes",
      "parentId": "fld_s2s",
      "headers": [
        { "name": "Content-Type",    "value": "application/json" },
        { "name": "X-Service-Token", "value": "{{ _.service_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"from\": { \"seller_profile_id\": \"slp_pedalesplata\" },\n  \"to\": {\n    \"city\": \"Córdoba\",\n    \"province\": \"Córdoba\",\n    \"postal_code\": \"X5000\",\n    \"country\": \"AR\"\n  },\n  \"packages\": [\n    { \"weight_grams\": 3000, \"length_cm\": 30, \"width_cm\": 25, \"height_cm\": 15 }\n  ],\n  \"service_level\": \"express\"\n}"
      },
      "metaSortKey": 200
    },
    {
      "_id": "req_shipment_post",
      "_type": "request",
      "name": "POST shipments (S2S Seller)",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/shipments",
      "parentId": "fld_s2s",
      "headers": [
        { "name": "Content-Type",    "value": "application/json" },
        { "name": "X-Service-Token", "value": "{{ _.service_token }}" },
        { "name": "Idempotency-Key", "value": "REEMPLAZAR_UUID" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"shipping_quote_id\": \"qte_REEMPLAZAR\",\n  \"order_id\": \"ord_REEMPLAZAR\",\n  \"order_seller_group_id\": \"osg_REEMPLAZAR\",\n  \"sales_order_id\": \"sor_REEMPLAZAR\",\n  \"seller_profile_id\": \"slp_pedalesplata\",\n  \"buyer_profile_id\": \"byp_mariagonzalez\",\n  \"shipping_address_snapshot\": {\n    \"street\": \"Av. Corrientes\", \"number\": \"1234\",\n    \"city\": \"CABA\", \"province\": \"Buenos Aires\",\n    \"postal_code\": \"C1043\", \"country\": \"AR\"\n  },\n  \"packages\": [\n    { \"weight_grams\": 3000, \"length_cm\": 30, \"width_cm\": 25, \"height_cm\": 15, \"description\": \"Bicicleta\" }\n  ]\n}"
      },
      "metaSortKey": 300
    },
    {
      "_id": "req_shipments_by_order",
      "_type": "request",
      "name": "GET shipments?orderId=…",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/shipments",
      "parentId": "fld_s2s",
      "parameters": [
        { "name": "orderId", "value": "{{ _.order_id }}" }
      ],
      "headers": [
        { "name": "X-Service-Token", "value": "{{ _.service_token }}" }
      ],
      "metaSortKey": 400
    },
    {
      "_id": "req_packages_post",
      "_type": "request",
      "name": "POST shipments/{id}/packages (S2S)",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/packages",
      "parentId": "fld_s2s",
      "headers": [
        { "name": "Content-Type",    "value": "application/json" },
        { "name": "X-Service-Token", "value": "{{ _.service_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"weight_grams\": 750,\n  \"length_cm\": 30,\n  \"width_cm\": 25,\n  \"height_cm\": 15,\n  \"description\": \"Casco extra\"\n}"
      },
      "metaSortKey": 500
    },
    {
      "_id": "req_tracking_events_get",
      "_type": "request",
      "name": "GET shipments/{id}/tracking-events",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/tracking-events",
      "parentId": "fld_s2s",
      "headers": [
        { "name": "X-Service-Token", "value": "{{ _.service_token }}" }
      ],
      "metaSortKey": 600
    },

    {
      "_id": "req_my_assignments",
      "_type": "request",
      "name": "GET my/assignments",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/my/assignments",
      "parentId": "fld_operator",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 100
    },
    {
      "_id": "req_my_operator_get",
      "_type": "request",
      "name": "GET my/operator",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/my/operator",
      "parentId": "fld_operator",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 200
    },
    {
      "_id": "req_my_operator_patch",
      "_type": "request",
      "name": "PATCH my/operator",
      "method": "PATCH",
      "url": "{{ _.base_url }}/api/v1/my/operator",
      "parentId": "fld_operator",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"phone\": \"+54 9 11 4444 5555\",\n  \"vehicle_type\": \"van\",\n  \"license_plate\": \"AB123CD\"\n}"
      },
      "metaSortKey": 210
    },
    {
      "_id": "req_tracking_event_post",
      "_type": "request",
      "name": "POST tracking-events (picked_up)",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/tracking-events",
      "parentId": "fld_operator",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"event_type\": \"picked_up\",\n  \"occurred_at\": \"2026-05-26T20:00:00.000Z\",\n  \"note\": \"Retiro OK\"\n}"
      },
      "metaSortKey": 300
    },
    {
      "_id": "req_deliver",
      "_type": "request",
      "name": "POST shipments/{id}/deliver",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/deliver",
      "parentId": "fld_operator",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"proof_photo_url\": \"https://pxyfzgcpfsypxqosemuy.supabase.co/storage/v1/object/public/delivery-proofs/example.jpg\",\n  \"note\": \"Entregado en portería\",\n  \"occurred_at\": \"2026-05-26T20:30:00.000Z\"\n}"
      },
      "metaSortKey": 400
    },
    {
      "_id": "req_retry",
      "_type": "request",
      "name": "POST shipments/{id}/retry",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/retry",
      "parentId": "fld_operator",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{}"
      },
      "metaSortKey": 500
    },
    {
      "_id": "req_upload_proof",
      "_type": "request",
      "name": "POST uploads/delivery-proof (multipart)",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/uploads/delivery-proof",
      "parentId": "fld_operator",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "multipart/form-data",
        "params": [
          { "name": "file", "type": "file", "fileName": "" }
        ]
      },
      "metaSortKey": 600
    },

    {
      "_id": "req_admin_shipments_list",
      "_type": "request",
      "name": "GET shipments (listado admin)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/shipments",
      "parentId": "fld_admin_sh",
      "parameters": [
        { "name": "page",     "value": "1" },
        { "name": "per_page", "value": "20" },
        { "name": "sort_by",  "value": "created_at" },
        { "name": "sort_dir", "value": "desc" }
      ],
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 100
    },
    {
      "_id": "req_admin_kpis",
      "_type": "request",
      "name": "GET shipments/kpis",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/shipments/kpis",
      "parentId": "fld_admin_sh",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 200
    },
    {
      "_id": "req_admin_shipment_detail",
      "_type": "request",
      "name": "GET shipments/{id}",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}",
      "parentId": "fld_admin_sh",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 300
    },
    {
      "_id": "req_admin_shipment_patch",
      "_type": "request",
      "name": "PATCH shipments/{id} (override status)",
      "method": "PATCH",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}",
      "parentId": "fld_admin_sh",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"status\": \"in_transit\",\n  \"note\": \"Demora por feriado\"\n}"
      },
      "metaSortKey": 310
    },
    {
      "_id": "req_admin_status_history",
      "_type": "request",
      "name": "GET shipments/{id}/status-history",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/status-history",
      "parentId": "fld_admin_sh",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 400
    },
    {
      "_id": "req_admin_delivery_proof",
      "_type": "request",
      "name": "GET shipments/{id}/delivery-proof",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/delivery-proof",
      "parentId": "fld_admin_sh",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 500
    },
    {
      "_id": "req_admin_assignments_get",
      "_type": "request",
      "name": "GET shipments/{id}/assignments",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/assignments",
      "parentId": "fld_admin_sh",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 600
    },
    {
      "_id": "req_admin_assignments_post",
      "_type": "request",
      "name": "POST shipments/{id}/assignments (asignar operador)",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/assignments",
      "parentId": "fld_admin_sh",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"operator_clerk_user_id\": \"user_2nKxYz7vQp\"\n}"
      },
      "metaSortKey": 610
    },
    {
      "_id": "req_admin_assignment_patch",
      "_type": "request",
      "name": "PATCH shipments/{id}/assignments/{aid} (reasignar)",
      "method": "PATCH",
      "url": "{{ _.base_url }}/api/v1/shipments/{{ _.shipment_id }}/assignments/{{ _.assignment_id }}",
      "parentId": "fld_admin_sh",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"operator_clerk_user_id\": \"user_otroOperador\"\n}"
      },
      "metaSortKey": 620
    },
    {
      "_id": "req_admin_create_shipment_dev",
      "_type": "request",
      "name": "POST admin/shipments (DEV — crear manual)",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/admin/shipments",
      "parentId": "fld_admin_sh",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"seller_profile_id\": \"slp_pedalesplata\",\n  \"buyer_profile_id\": \"byp_mariagonzalez\",\n  \"buyer_name\": \"María González\",\n  \"service_level\": \"standard\",\n  \"pickup_address\": {\n    \"street\": \"Av. Rivadavia\", \"number\": \"9000\",\n    \"city\": \"Caballito\", \"province\": \"Buenos Aires\",\n    \"postal_code\": \"C1406\", \"country\": \"AR\"\n  },\n  \"shipping_address\": {\n    \"street\": \"Av. Corrientes\", \"number\": \"1234\",\n    \"city\": \"CABA\", \"province\": \"Buenos Aires\",\n    \"postal_code\": \"C1043\", \"country\": \"AR\"\n  },\n  \"packages\": [\n    { \"weight_grams\": 3000, \"length_cm\": 30, \"width_cm\": 25, \"height_cm\": 15, \"description\": \"Bicicleta\" }\n  ]\n}"
      },
      "metaSortKey": 700
    },

    {
      "_id": "req_admin_operators_list",
      "_type": "request",
      "name": "GET logistics-operators (listado)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/logistics-operators",
      "parentId": "fld_admin_op",
      "parameters": [
        { "name": "page",     "value": "1" },
        { "name": "per_page", "value": "20" }
      ],
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 100
    },
    {
      "_id": "req_admin_operators_list_detailed",
      "_type": "request",
      "name": "GET logistics-operators?detailed=1 (con counts)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/logistics-operators",
      "parentId": "fld_admin_op",
      "parameters": [
        { "name": "detailed", "value": "1" },
        { "name": "page",     "value": "1" },
        { "name": "per_page", "value": "20" }
      ],
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 110
    },
    {
      "_id": "req_admin_operators_post",
      "_type": "request",
      "name": "POST logistics-operators",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/logistics-operators",
      "parentId": "fld_admin_op",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"clerk_user_id\": \"user_2nKxYz...\",\n  \"full_name\": \"Juan Pérez\",\n  \"email\": \"juan@logistica.bicimarket.com\",\n  \"phone\": \"+5491133334444\",\n  \"document_id\": \"30123456\",\n  \"vehicle_type\": \"van\",\n  \"license_plate\": \"AB123CD\"\n}"
      },
      "metaSortKey": 200
    },
    {
      "_id": "req_admin_operator_get",
      "_type": "request",
      "name": "GET logistics-operators/{id}",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/logistics-operators/{{ _.operator_id }}",
      "parentId": "fld_admin_op",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 300
    },
    {
      "_id": "req_admin_operator_patch",
      "_type": "request",
      "name": "PATCH logistics-operators/{id} (suspender / editar)",
      "method": "PATCH",
      "url": "{{ _.base_url }}/api/v1/logistics-operators/{{ _.operator_id }}",
      "parentId": "fld_admin_op",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"status\": \"suspended\"\n}"
      },
      "metaSortKey": 310
    },
    {
      "_id": "req_admin_operator_performance",
      "_type": "request",
      "name": "GET logistics-operators/{id}/performance",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/logistics-operators/{{ _.operator_id }}/performance",
      "parentId": "fld_admin_op",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 400
    },
    {
      "_id": "req_admin_operator_active",
      "_type": "request",
      "name": "GET logistics-operators/{id}/active-assignments",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/logistics-operators/{{ _.operator_id }}/active-assignments",
      "parentId": "fld_admin_op",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 410
    },
    {
      "_id": "req_admin_operators_kpis",
      "_type": "request",
      "name": "GET logistics-operators/kpis",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/logistics-operators/kpis",
      "parentId": "fld_admin_op",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 500
    },

    {
      "_id": "req_admin_rates_list",
      "_type": "request",
      "name": "GET shipping-rates (todas)",
      "method": "GET",
      "url": "{{ _.base_url }}/api/v1/shipping-rates",
      "parentId": "fld_admin_rt",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 100
    },
    {
      "_id": "req_admin_rates_post",
      "_type": "request",
      "name": "POST shipping-rates (crear)",
      "method": "POST",
      "url": "{{ _.base_url }}/api/v1/shipping-rates",
      "parentId": "fld_admin_rt",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"carrier\": \"andreani\",\n  \"service_level\": \"standard\",\n  \"distance_km_min\": 0,\n  \"distance_km_max\": 10,\n  \"weight_grams_min\": 0,\n  \"weight_grams_max\": 2000,\n  \"cost_cents\": 250000,\n  \"estimated_days_min\": 3,\n  \"estimated_days_max\": 5,\n  \"active\": true\n}"
      },
      "metaSortKey": 200
    },
    {
      "_id": "req_admin_rate_patch",
      "_type": "request",
      "name": "PATCH shipping-rates/{id}",
      "method": "PATCH",
      "url": "{{ _.base_url }}/api/v1/shipping-rates/{{ _.rate_id }}",
      "parentId": "fld_admin_rt",
      "headers": [
        { "name": "Content-Type",  "value": "application/json" },
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"cost_cents\": 300000,\n  \"active\": true\n}"
      },
      "metaSortKey": 300
    },
    {
      "_id": "req_admin_rate_delete",
      "_type": "request",
      "name": "DELETE shipping-rates/{id}",
      "method": "DELETE",
      "url": "{{ _.base_url }}/api/v1/shipping-rates/{{ _.rate_id }}",
      "parentId": "fld_admin_rt",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{ _.bearer_token }}" }
      ],
      "metaSortKey": 400
    }
  ]
}
```

---

## Cómo conseguir el `bearer_token` (JWT de Clerk) en dev

En el browser, con tu sesión iniciada en `localhost:3000`, abrí DevTools → Console y pegá:

```js
// Listar cookies relevantes de Clerk
document.cookie.split("; ").filter(c => c.startsWith("__"));
```

El `__session` es el cookie con el JWT. Como Insomnia mata la sesión httpOnly, una forma alternativa en dev:

1. Logueate como admin en `localhost:3000`.
2. Network tab → cualquier request a `/api/v1/...` → headers → `cookie` → copiá el valor de `__session=...`.
3. En Insomnia, en lugar de `Authorization: Bearer ...`, configurá un header `cookie: __session=<el-valor>`.

O bien usá Clerk Dashboard → Sessions → Generate a session token para tu user. Eso te da un JWT válido que pegás en `bearer_token` del environment.

---

## Mantener este doc al día

Si agregás un endpoint nuevo:
1. Sumalo a la tabla del top.
2. Agregá una request al JSON con `_id` único (prefijo `req_`), `parentId` correcto y `metaSortKey` para ordenarlo.
3. Si necesitás una variable nueva, sumala al `data` del environment `env_local`.
4. Reimportá la colección en Insomnia (importará como workspace nuevo o sobrescribirá según elijas en el dialog).
