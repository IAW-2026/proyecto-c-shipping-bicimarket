# 1.1 — Descripción del Sistema (Shipping App)

> **Tipo C — Marketplace · BiciMarket · Shipping App**
> Esta copia local del repo de Shipping está recortada para dejar solo lo necesario para implementar y operar Shipping. La versión canónica completa (las 4 apps) vive en `proyecto-c-etapa-1-bicimarket/docs/`.

---

## 1. Qué es BiciMarket

BiciMarket es un marketplace de bicicletas y repuestos que conecta vendedores con compradores. El sistema se compone de **cuatro webapps independientes** (Buyer, Seller, Shipping, Payments) que se comunican entre sí **siempre por REST sobre HTTP**: las consultas con `GET`, las notificaciones de cambio de estado con `POST`/`PATCH` server-to-server, autenticadas con header `X-Service-Token` por par origen↔destino. No hay colas de mensajes, ni event bus, ni firmas HMAC.

### 1.1 Restricción del proyecto: stock ilimitado

> Para esta etapa el sistema **no maneja control de stock**: toda publicación `active` se considera disponible. Para Shipping esto implica que un shipment se crea siempre que la quote sea válida — no hay validación de inventario aguas arriba. Si en una etapa futura se habilita stock, no toca a Shipping.

## 2. Apps del sistema (orientación)

| App | Rol | Responsable |
|---|---|---|
| Buyer App | Carrito y `order` | Camila Rojas |
| Seller App | Catálogo y `sales_orders` | Pierino Spina |
| **Shipping App** | **Logística, dueña de `shipments`, paquetes y eventos de tracking** | **Enrique Seitz (yo)** |
| Payments App | Pasarela MP y liquidaciones | Rocco Paoloni |

> Cada app tiene su propio Clerk. Las apps se hablan solo por REST con `X-Service-Token`. Ver `05-usuarios.md`.

## 3. Actores relevantes para Shipping

| Actor | Apps donde se loguea | Clerk(s) que usa |
|---|---|---|
| Operador logístico | Shipping App | Clerk-Shipping (rol `logistics`) |
| Admin transversal | Shipping App (entre otras) | Clerk-Shipping con `publicMetadata.admin=true` |

## 4. Flujos principales (con foco en Shipping)

Convenciones del diagrama:
- Línea sólida (`->>`): REST iniciado por UI → backend propio.
- Línea punteada (`-->>`): REST server-to-server entre apps (`X-Service-Token`).
- `note`: trabajo interno (DB, validaciones, llamadas externas).

---

### 4.1 Cotización al checkout (Shipping desde la perspectiva del checkout)

Buyer App necesita cotizar envío por cada `seller_group` durante el checkout. Esta es la única vez que Buyer llama a Shipping antes del pago.

```mermaid
sequenceDiagram
    autonumber
    participant B as Buyer App
    participant SH as Shipping App
    participant S as Seller App

    B->>SH: POST /api/v1/shipping-quotes (por cada seller_group)
    SH->>S: GET /api/v1/seller-profile/{id}/pickup-address
    S-->>SH: pickup_address
    note over SH: Calcula tarifa por (peso, zona, service_level)<br/>y persiste shipping_quote con expires_at = now + 60min
    SH-->>B: { qte_id, cost_cents, estimated_days, expires_at }
    note over B: Buyer guarda quote_id por seller_group<br/>y lo manda al crear la orden
```

> **Sprint 1 / app standalone (ADR-002)**: la llamada saliente a Seller está mockeada (`lib/mocks.ts: getMockPickupAddress`). En sprint 2 se cablea con `callServiceApi`.

---

### 4.2 Despacho y entrega (Shipping protagonista)

Tras el pago, Seller crea el shipment y un operador logístico lo retira y lo entrega.

```mermaid
sequenceDiagram
    autonumber
    actor V as Vendedor
    actor OP as Operador Logístico
    participant S as Seller App
    participant SH as Shipping App
    participant B as Buyer App
    participant P as Payments App

    S->>SH: POST /api/v1/shipments (sales_order_id, packages[])
    note over SH: Valida quote, genera tracking_number,<br/>crea shipment + packages + tracking_event "created"
    SH-->>S: shipment_id, tracking_number, label_url, status=ready_for_pickup
    OP->>SH: GET /api/v1/my/assignments
    SH-->>OP: lista de envíos asignados
    OP->>SH: POST /api/v1/shipments/{id}/tracking-events (picked_up)
    SH-->>B: PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping (picked_up)
    SH-->>S: PATCH /api/v1/sales-orders/{id}/shipping-status (picked_up)
    OP->>SH: POST /api/v1/shipments/{id}/tracking-events (in_transit)
    OP->>SH: POST /api/v1/shipments/{id}/deliver (proof_photo, signature, note)
    note over SH: shipment.status = delivered<br/>+ delivery_proof persistido
    SH-->>B: PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping (delivered)
    SH-->>S: PATCH /api/v1/sales-orders/{id}/shipping-status (delivered)
    SH-->>P: POST /api/v1/internal/shipment-delivered (gatilla liquidación)
```

#### Reglas

- El operador logístico **no ve datos de pago**. Solo dirección, tracking, peso y bultos.
- El `delivery_proof` (foto + nota; firma opcional) es obligatorio para pasar a `delivered`.
- Las notificaciones tras cambio de estado son llamadas REST normales con `X-Service-Token`.

> **Sprint 1 / app standalone (ADR-002)**: las llamadas salientes a Buyer/Seller/Payments están **diferidas**. Se reemplazan por `logger.info({ level: "outbound-deferred", target, payload })`. La lógica de transición local funciona igual.

---

## 5. Mapa de comunicación (foco Shipping)

```mermaid
flowchart LR
    Buyer["Buyer App"]
    Seller["Seller App"]
    Shipping["Shipping App"]
    Payments["Payments App"]

    Buyer -- "POST shipping-quotes / GET shipments" --> Shipping
    Seller -- "POST shipments / POST packages" --> Shipping
    Shipping -- "GET pickup-address" --> Seller
    Shipping -- "PATCH seller-groups shipping" --> Buyer
    Shipping -- "PATCH shipping-status" --> Seller
    Shipping -- "POST internal/shipment-delivered" --> Payments

    classDef solid fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    class Buyer,Seller,Shipping,Payments solid
```

Toda flecha es REST sobre HTTP con `X-Service-Token`. No hay colas, ni webhooks entre nuestras apps.

## 6. Estado clave: `shipment.status`

```
created → ready_for_pickup → picked_up → in_transit → out_for_delivery → delivered
                                                                       ↘ failed_delivery → in_transit (retry)
                                                                                        ↘ returned (tras N intentos)
```

Diagrama completo + tabla de transiciones permitidas en `06-estados-y-diagramas.md`.