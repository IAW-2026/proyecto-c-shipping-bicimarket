# `src/adapters/`

> **Sprint 1 / app standalone (ADR-002): esta carpeta está vacía a propósito.**

Acá viven los adapters de respuestas crudas de **otras apps del marketplace** (Buyer, Seller, Payments) hacia el DTO canónico de Shipping. Solo aplican cuando un route handler nuestro hace `callServiceApi("seller", ...)` y necesita normalizar el shape externo antes de devolverlo.

## Cuándo crear un adapter acá

Cuando se cumplen **las dos** condiciones:

1. El route handler hace un `callServiceApi` a Buyer/Seller/Payments.
2. La respuesta cruda (`XApi` en `src/types/external/`) tiene un shape distinto del DTO canónico que querés devolver (`XDTO` en `src/types/`).

Si el shape ya coincide, no hace falta adapter — el route handler hace `return NextResponse.json(raw)` directamente.

## Patrón

```ts
// src/adapters/seller.ts (ejemplo sprint 2)
import type { SellerPickupAddressApi } from "@/types/external/seller";
import type { Address } from "@/types/common";

export function adaptPickupAddressApi(raw: SellerPickupAddressApi): Address {
  return {
    street: raw.pickup_address.street,
    number: raw.pickup_address.number,
    city: raw.pickup_address.city,
    province: raw.pickup_address.province,
    postal_code: raw.pickup_address.postal_code,
    country: raw.pickup_address.country,
  };
}
```

El adapter se invoca **dentro del route handler**, no en el service:

```ts
// src/app/api/v1/seller-profile/[id]/pickup-address/route.ts (sprint 2)
const res = await callServiceApi("seller", `/api/v1/seller-profile/${id}/pickup-address`);
const raw = (await res.json()) as SellerPickupAddressApi;
return NextResponse.json(adaptPickupAddressApi(raw));
```

Ver `docs/07-flujo-get-endpoint.md §5` para el detalle del patrón.

## Sprint 1 — qué está mockeado

Mientras el outbound está diferido (ADR-002), los "adapters" están reemplazados por mocks en `src/lib/mocks.ts` (ej: `getMockPickupAddress`). Cuando se reactive el outbound, cada mock se reemplaza por `callServiceApi + adapter`.
