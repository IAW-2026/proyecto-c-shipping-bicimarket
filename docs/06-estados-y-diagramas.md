# 1.6 — Estados y Diagramas (Shipping App)

> **Tipo C — Marketplace · BiciMarket · Shipping App**
> Copia local recortada: solo máquina de estado de `shipment.status`, diagrama de carril de entrega fallida y tabla normativa de transiciones permitidas para shipments. Las máquinas de estado de las otras 3 apps quedan en `proyecto-c-etapa-1-bicimarket/docs/`.

> **Restricción del proyecto — stock ilimitado**: ningún diagrama contempla descuento/reserva de stock. Ver `01-descripcion.md §1.1`.

---

## 1. Máquina de estado: `shipment.status`

```mermaid
stateDiagram-v2
    [*] --> created
    created --> ready_for_pickup: etiqueta generada y asignada
    ready_for_pickup --> picked_up: tracking_event picked_up
    picked_up --> in_transit: tracking_event in_transit
    in_transit --> out_for_delivery: tracking_event out_for_delivery
    in_transit --> delivered: POST /deliver con prueba
    in_transit --> failed_delivery: tracking_event failed_delivery
    out_for_delivery --> delivered: POST /deliver con prueba
    out_for_delivery --> failed_delivery: tracking_event failed_delivery
    failed_delivery --> in_transit: reintento
    failed_delivery --> returned: tras N intentos
    delivered --> [*]
    returned --> [*]
```

**Reglas**:
- Una transición inválida debe rechazarse con HTTP `409 INVALID_TRANSITION` y `details: { from, to, allowed: [...] }`.
- `delivered` y `returned` son terminales.
- El cambio de estado lo dispara `POST /tracking-events` o `POST /deliver`; ambos validan la transición con `assertTransition()` (ver `lib/transitions.ts`, ticket T03).

---

## 2. Diagrama de carril — entrega fallida y reintento

```mermaid
sequenceDiagram
    autonumber
    actor OP as Operador
    participant SH as Shipping App
    participant B as Buyer App
    participant S as Seller App
    participant P as Payments App

    OP->>SH: POST /api/v1/shipments/{id}/tracking-events (failed_delivery)
    SH-->>B: PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping (failed_delivery)
    SH-->>S: PATCH /api/v1/sales-orders/{id}/shipping-status (failed_delivery)
    note over OP: agendar segundo intento
    OP->>SH: POST /api/v1/shipments/{id}/tracking-events (out_for_delivery)
    OP->>SH: POST /api/v1/shipments/{id}/deliver (proof)
    SH-->>B: PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping (delivered)
    SH-->>S: PATCH /api/v1/sales-orders/{id}/shipping-status (delivered)
    SH-->>P: POST /api/v1/internal/shipment-delivered
```

Si el segundo intento también falla y se acumulan 3 intentos, el shipment pasa a `returned` y se dispara el flujo de reembolso (gestionado por Payments — fuera del scope de Shipping).

> **Sprint 1 (ADR-002)**: las flechas salientes `SH-->>` están diferidas — se reemplazan por logs `outbound-deferred`. La lógica de transición local funciona igual.

---

## 3. Transiciones permitidas: `shipment.status` (tabla normativa)

Toda transición inválida debe rechazarse con `409 INVALID_TRANSITION`. Esta tabla es la fuente de verdad para `lib/transitions.ts` (ver ticket T03):

| from \ to | ready_for_pickup | picked_up | in_transit | out_for_delivery | delivered | failed_delivery | returned |
|---|---|---|---|---|---|---|---|
| created | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ready_for_pickup | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| picked_up | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| in_transit | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| out_for_delivery | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| failed_delivery | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| delivered | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| returned | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Estado agregado del pedido (ADR-005, derivado)

Una orden con N vendedores genera N `Shipment` con el mismo `order_id`. La máquina de estado de arriba sigue siendo **por shipment** — cada uno transiciona independiente. **No** persistimos un "estado del pedido". Sin embargo, cuando se marca el último shipment de un `order_id` como `picked_up` y todos los demás del mismo `order_id` ya están en `picked_up` o más adelante, el handler de tracking-events emite un log derivado:

```
{ level: "outbound-deferred", target: "buyer", method: "POST",
  path: "/api/v1/orders/{order_id}/all-shipments-picked-up",
  payload: { order_id, shipment_ids: [shp_..., shp_...], occurred_at } }
```

Aplica solo cuando `siblings.length > 1` (pedidos multi-vendedor). Para pedidos single-origen alcanza con los CR2/CR3 individuales — no se emite el log agregado.

> **Sprint 1 (ADR-002)**: este log queda como `outbound-deferred`. En sprint 2 se convierte en una llamada real al Buyer (CR2 consolidado o un endpoint nuevo). La UI del operador (`OrderPickupCard` en `/dashboard/assignments`) usa el mismo razonamiento en el cliente para mostrar la card como "Todos retirados" y habilitar el avance bulk a `in_transit`.