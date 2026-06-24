# 1.7 — Flujo de consumo de un endpoint GET

> **Shipping App** · Stack: Next 16 + Prisma 6 + Clerk 7 + TanStack Query 5 + axios + sonner + shadcn.
> Convención obligatoria para **toda** lectura de datos en el frontend. No bypassar este flujo.

## Diagrama general

El shell **Componente → Hook → Service → Route Handler** es **siempre el mismo**, sin importar de dónde salgan los datos. Lo único que varía es **qué hace el route handler internamente para conseguirlos**.

```
Componente ("use client")
  → Hook (useQuery)            src/hooks/querys/{dominio}/use{Recurso}.ts
    → Service (axios → /api/)  src/services/api/{dominio}.ts
      → Route Handler (Next)   src/app/api/v1/.../route.ts
        │
        ├─── CASO A (99% del tiempo): los datos viven en nuestra DB
        │      → prisma.{modelo}.findMany / findUnique / ...
        │
        └─── CASO B (sprint 2 — hoy mockeado): los datos viven en OTRA app
               → callServiceApi("seller", "/seller-profile/{id}/pickup-address")
                  (helper en src/lib/service-auth.ts, REST + X-Service-Token)
                 → Seller App
               ← shape crudo de la API externa (XApi)
               → adapter en src/adapters/{dominio}.ts → DTO de Shipping
        │
      ← JSON con el DTO (shape canónico — mismo formato en A y B)
    ← response.data tipado
← data, isLoading, isError, error, refetch — listos para el componente
```

**Por qué el hook SIEMPRE existe, sea A o B:**

El frontend no se entera de dónde salieron los datos. El componente hace `const { data, isLoading, error } = useShipment(id)` y se lleva todo lo que TanStack Query ofrece (loading state, error state, retry, cache, refetch, staleness, devtools…). Esa garantía se pierde si saltás el shell — por eso **toda lectura, sin excepciones, pasa por hook**.

**Dónde vive el adapter:**

El adapter vive **dentro del route handler**, no en el service. El contrato de `/api/v1/...` es siempre el DTO canónico — el adapter es un detalle interno de implementación. Esto garantiza:
- El service queda trivial (`await api.get(); return response.data`).
- Cualquier consumidor del endpoint (este frontend, server components, futuras integraciones) recibe el mismo shape.
- Si mañana cambiamos la fuente (Prisma ↔ otra app), el frontend no se entera.

> **Sprint 1 / app standalone (ADR-002)**: el CASO B se mockea desde `src/lib/mocks.ts` (ej: `getMockPickupAddress(sellerProfileId)`). El route handler invoca el mock en lugar de `callServiceApi`. Cuando se reactive en sprint 2, cambia **solo** la implementación del route handler; service / hook / componente no cambian.

---

## Ejemplo concreto — `GET /api/v1/my/assignments`

### 1. Hook — `useMyAssignments`

**Archivo:** `src/hooks/querys/assignments/useMyAssignments.ts`

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getMyAssignments } from "@/services/api/assignments";

export function useMyAssignments() {
  return useQuery({
    queryKey: ["my-assignments"],
    queryFn: getMyAssignments,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) return false;
      }
      return failureCount < 2;
    },
    staleTime: 60 * 1000,        // 1 min — assignments cambian rápido
    refetchOnWindowFocus: true,   // volver al tab → refetch
    refetchOnReconnect: false,
  });
}
```

**Responsabilidades del hook:**

- `queryKey` única por endpoint + parámetros relevantes (acá no hay porque sale del JWT del usuario logueado).
- `staleTime` corto cuando los datos cambian rápido (assignments, tracking). Largo (5+ min) para datos estables (perfil de operador, shipping_rates).
- `retry: false` ante 401/403 — no tiene sentido reintentar si falta auth.
- `enabled: !!param` cuando depende de un valor opcional:
  ```ts
  enabled: !!shipmentId,
  ```
- **Un hook por recurso**. `useMyAssignments`, `useShipment(id)`, `useShipmentTrackingEvents(id)`. Nunca un mega-hook que devuelve varios recursos.

### 2. Service — `getMyAssignments`

**Archivo:** `src/services/api/assignments.ts`

```ts
import { api } from "@/lib/axios";
import type { AssignmentDTO, PaginatedResponse } from "@/types/assignments";

export async function getMyAssignments(): Promise<PaginatedResponse<AssignmentDTO>> {
  const response = await api.get<PaginatedResponse<AssignmentDTO>>("/v1/my/assignments");
  return response.data;
}
```

**Responsabilidades:**

- Usa la instancia `api` de `@/lib/axios` (`baseURL: "/api"`).
- URL relativa: `/v1/my/assignments` → Next la rutea a `src/app/api/v1/my/assignments/route.ts`.
- **Sin try/catch.** El error propaga al hook y React Query lo expone via `error`.
- Devuelve `response.data` tipado. Nuestra API devuelve el shape directo (sin envelope tipo `{ data: ... }`).

### 3. Route Handler

**Archivo:** `src/app/api/v1/my/assignments/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { paginate } from "@/lib/pagination";
import { handleApiError, ApiError } from "@/lib/api-error";

const ACTIVE_STATUSES = [
  "ready_for_pickup",
  "picked_up",
  "in_transit",
  "out_for_delivery",
] as const;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) throw new ApiError("UNAUTHORIZED", 401, "Login requerido");

    const operator = await prisma.logisticsOperator.findUnique({
      where: { clerkUserId: userId },
    });
    if (!operator || operator.status !== "active") {
      throw new ApiError("FORBIDDEN", 403, "Operador inactivo o inexistente");
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    const result = await paginate(
      prisma.shipment,
      {
        where: {
          assignments: {
            some: {
              operatorClerkUserId: userId,
              status: { in: ["assigned", "accepted", "picked_up"] },
            },
          },
          status: { in: ACTIVE_STATUSES as unknown as string[] },
        },
        orderBy: { createdAt: "desc" },
      },
      { page, limit }
    );

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
```

**Responsabilidades:**

- Valida JWT con `auth()` de Clerk (no usa `currentUser()` salvo que necesite email/nombre; `auth()` es más barato).
- **Habla directo con Prisma** — no hace fetch a otro backend. Es la regla por defecto en Shipping sprint 1.
- Devuelve el shape del contrato (`docs/03-apis.md §SH5`).
- Errores normalizados con `handleApiError` (ver `lib/api-error.ts`, ticket T03).

### 4. Tipos

**Archivo:** `src/types/assignments.ts`

```ts
import type { ShipmentStatus } from "./shipments";

export interface Address {
  street: string;
  number: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
}

export interface AssignmentDTO {
  id: string;                    // shp_…
  tracking_number: string;
  status: ShipmentStatus;
  pickup_address: Address;
  shipping_address: Address;
  weight_grams_total: number;
  packages_count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
}
```

**Convenciones de naming en `src/types/`:**

| Sufijo | Significado | Cuándo |
|---|---|---|
| `XDTO` | Forma del JSON que viaja por nuestra API (route handler ↔ frontend) | Siempre. Es lo que el hook devuelve. |
| `XApi` | Forma cruda devuelta por una API externa (ej: Seller App) | Solo sprint 2, dentro de adapters. |
| `CreateXBody` / `UpdateXBody` | Forma del body que se manda en POST/PATCH | En mutations, tipado en service y hook. |

> Las interfaces **siempre** viven en `src/types/{dominio}.ts`. Nunca inline en hooks o componentes. Un archivo por dominio (`shipments.ts`, `assignments.ts`, `tracking-events.ts`, `logistics-operators.ts`).

### 5. Adapter (raro en sprint 1)

Cuando el route handler devuelve directo de Prisma + el shape coincide con el DTO, **no hay adapter**.

Sí aplica cuando:
- **Sprint 2**: el route handler hace `callServiceApi` a otra app y la respuesta cruda (`XApi`) necesita normalizarse al DTO canónico (`XDTO`).
- Casos donde el shape de Prisma tiene cosas que la UI no necesita (snapshots JSON crudos, IDs internos, timestamps de auditoría) y conviene limpiarlo antes de exponerlo.

El adapter vive en `src/adapters/{dominio}.ts` y **se llama dentro del route handler** — nunca desde el service. Así el contrato del endpoint sigue siendo siempre el DTO canónico:

```ts
// sprint 2 — src/app/api/v1/seller-profile/[sellerProfileId]/pickup-address/route.ts
import { callServiceApi } from "@/lib/service-auth";
import { adaptPickupAddressApi } from "@/adapters/seller";
import type { SellerPickupAddressApi } from "@/types/seller";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sellerProfileId: string }> }) {
  try {
    const { sellerProfileId } = await params;
    const res = await callServiceApi("seller", `/api/v1/seller-profile/${sellerProfileId}/pickup-address`);
    const raw = (await res.json()) as SellerPickupAddressApi;
    return NextResponse.json(adaptPickupAddressApi(raw));   // ← acá vive el adapter
  } catch (err) {
    return handleApiError(err);
  }
}
```

El service del frontend queda trivial — no sabe nada del adapter:

```ts
// src/services/api/seller-profile.ts
export async function getPickupAddress(sellerProfileId: string): Promise<PickupAddressDTO> {
  const response = await api.get<PickupAddressDTO>(`/v1/seller-profile/${sellerProfileId}/pickup-address`);
  return response.data;
}
```

Y el hook idéntico al CASO A — el componente no se entera de que el dato venía de Seller:

```ts
export function usePickupAddress(sellerProfileId?: string) {
  return useQuery({
    queryKey: ["seller-profile", sellerProfileId, "pickup-address"],
    queryFn: () => getPickupAddress(sellerProfileId!),
    enabled: !!sellerProfileId,
    staleTime: 5 * 60 * 1000,  // pickup_address cambia poco
  });
}
```

---

## Convención de queryKeys

QueryKeys jerárquicas con **prefijos por dominio**, para que las mutations puedan invalidar por prefijo (`exact: false`):

```
["shipments"]                              // dominio entero
["shipments", shipmentId]                  // un shipment
["shipments", shipmentId, "tracking"]      // tracking events de un shipment
["my-assignments"]                          // assignments del operador logueado (singleton)
["logistics-operators"]                     // listado admin
["logistics-operators", operatorId]         // detalle admin
["shipments", "admin", filters, page, ...]  // listado admin con scope "admin" para no chocar
```

**Regla:** el primer elemento es siempre el nombre del dominio (`"shipments"`, `"my-assignments"`, etc.). El segundo es el ID si aplica. El tercero un sub-recurso o scope.

Cuando una mutation toca un recurso, invalida la key más amplia que cubre todas las queries afectadas. Detalle en `08-flujo-mutations.md`.

---

## Server Components vs Client Components

- **Server Component** (`page.tsx` sin `"use client"`) — para fetch inicial sin interactividad. Útil cuando el page solo muestra datos estáticos o cuando el TTFB importa.
  ```tsx
  export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { id } });
    return <ShipmentDetail shipment={shipment} />;
  }
  ```
- **Client Component + React Query** — **caso default en Shipping**. La UI del operador es interactiva (refresh tras marcar entregado, polling cada X minutos, toasts), React Query es el patrón.

Estructura típica: `page.tsx` es server component liviano (puede leer params, layout), y embebe un client component que usa el hook.

---

## Resumen del patrón GET

Para agregar un GET nuevo:

1. **Tipos** en `src/types/{dominio}.ts` — `XDTO`, `PaginatedResponse<XDTO>` si lista.
2. **Route Handler** en `src/app/api/v1/.../route.ts` — `auth()` + Prisma directo + `handleApiError`. Nunca `try/catch` silencioso, todo error pasa por `handleApiError`.
3. **Service** en `src/services/api/{dominio}.ts` — `async function getX()` con `api.get` tipado y `response.data`.
4. **Hook** en `src/hooks/querys/{dominio}/useX.ts` — `useQuery` con queryKey, retry, staleTime, `enabled` si aplica.
5. **(Opcional) Adapter** en `src/adapters/{dominio}.ts` — solo si la fuente es externa (sprint 2) o el shape necesita normalización.

**Regla de oro**: el componente nunca llama a `axios` directo ni a `prisma` directo. Siempre pasa por el hook.
