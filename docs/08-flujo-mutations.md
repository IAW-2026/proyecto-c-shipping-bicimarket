# 1.8 — Flujo de mutations (POST / PATCH / DELETE)

> **Shipping App** · Stack: Next 16 + Prisma 6 + Clerk 7 + TanStack Query 5 + axios + sonner + zod + shadcn.
> Convención obligatoria para **toda** mutación de datos en el frontend.

## Diagrama general

**Caso 99% del tiempo — la mutación toca nuestra DB (Prisma) en una `$transaction`:**

```
Componente ("use client")
  → Hook agrupado por dominio          src/hooks/querys/{dominio}/use{Dominio}Mutations.ts
    → useApiMutation (helper genérico)  src/hooks/querys/common/useApiMutation.tsx
      → Service (axios → /api/)         src/services/api/{dominio}.ts
        → Route Handler (Next)          src/app/api/v1/.../route.ts
          ├─ auth() + zod
          ├─ assertTransition() (si cambia status)
          └─ prisma.$transaction(async tx => { ... })
        ← JSON con la entidad creada/actualizada
      ← Toast loading → success/error + invalidación de queryKeys
← UI se refresca automáticamente
```

Los outbounds a Buyer/Seller/Payments se ejecutan después del commit local.
`callServiceApi` aplica los reintentos y `Promise.allSettled` evita que una
caída externa revierta una transición física ya confirmada.

---

## 1. Helper genérico — `useApiMutation`

**Archivo:** `src/hooks/querys/common/useApiMutation.tsx`

Todas las mutations se construyen sobre este wrapper. Encapsula tres responsabilidades que de otra forma se repetirían en cada hook: toasts (sonner), invalidación de caché y parsing del shape de error de nuestra API.

```tsx
"use client";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";

interface ApiErrorBody {
  error?: { code: string; message: string; details?: unknown };
  message?: string;
}

export type ApiError = AxiosError<ApiErrorBody>;

interface UseApiMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, ApiError, TVariables, any>, "mutationFn"> {
  mutationFn: (vars: TVariables) => Promise<TData>;
  invalidateKeys?: QueryKey[];
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
}

export function useApiMutation<TData, TVariables>({
  mutationFn,
  invalidateKeys,
  successMessage,
  errorMessage,
  loadingMessage = "Procesando…",
  onMutate,
  onSuccess,
  onError,
  onSettled,
  ...options
}: UseApiMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVariables, any>({
    mutationFn,

    onMutate: async (variables) => {
      const toastId = toast.loading(loadingMessage);
      const custom = onMutate ? await onMutate(variables) : undefined;
      return { ...(custom ?? {}), toastId };
    },

    onSuccess: async (data, variables, context) => {
      if (invalidateKeys) {
        await Promise.all(
          invalidateKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key, exact: false })
          )
        );
      }
      if (successMessage) toast.success(successMessage);
      await onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      const body = error.response?.data;
      const msg =
        body?.error?.message ||
        body?.message ||
        errorMessage ||
        "Ocurrió un error inesperado";
      toast.error(msg);
      onError?.(error, variables, context);
    },

    onSettled: async (data, error, variables, context) => {
      if (context?.toastId) toast.dismiss(context.toastId);
      await onSettled?.(data, error, variables, context);
    },

    ...options,
  });
}
```

**Responsabilidades:**

- **`mutationFn`** — la función async que hace la llamada (el service).
- **`invalidateKeys`** — array de `QueryKey` a invalidar en `onSuccess`. Siempre con `exact: false` (matchea por prefijo, así que invalidar `["shipments"]` matchea `["shipments", id]`, `["shipments", id, "tracking"]`, etc.).
- **`successMessage`** — texto del toast al completarse. Si se omite, no se muestra success (útil cuando el side-effect es navegación).
- **`loadingMessage` / `errorMessage`** — opcionales, defaults razonables.
- **Toast loading → success/error → dismiss** automático vía `sonner`.
- **Parsing de errores** normalizado al shape de nuestra API (`{ error: { code, message, details } }`), con fallbacks razonables.
- **Propaga** `onMutate`, `onSuccess`, `onError`, `onSettled` del consumidor sin pisar los del helper.

> Usar `useMutation` directo solo tiene sentido cuando se necesita algo que este helper no contempla (optimistic updates complejos). Convención del proyecto: **siempre `useApiMutation`**.

---

## 2. Hook agrupado por dominio — `useShipmentMutations`

**Archivo:** `src/hooks/querys/shipments/useShipmentMutations.ts`

Cada dominio expone **un solo hook** que retorna un objeto con todas las mutations de ese dominio. **Una mutation por acción**, agrupadas por dominio.

```ts
"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import {
  createTrackingEvent,
  deliverShipment,
  patchShipmentStatus,
} from "@/services/api/shipments";
import type {
  CreateTrackingEventBody,
  DeliverShipmentBody,
  ShipmentStatus,
} from "@/types/shipments";

export function useShipmentMutations(shipmentId: string) {
  const shipmentKey = ["shipments", shipmentId];
  const trackingKey = ["shipments", shipmentId, "tracking"];
  const assignmentsKey = ["my-assignments"];

  return {
    addTrackingEvent: useApiMutation({
      mutationFn: (data: CreateTrackingEventBody) =>
        createTrackingEvent(shipmentId, data),
      invalidateKeys: [shipmentKey, trackingKey, assignmentsKey],
      successMessage: "Evento de tracking registrado",
    }),

    deliver: useApiMutation({
      mutationFn: (data: DeliverShipmentBody) => deliverShipment(shipmentId, data),
      invalidateKeys: [shipmentKey, trackingKey, assignmentsKey],
      successMessage: "Envío marcado como entregado",
    }),

    updateStatus: useApiMutation({
      mutationFn: (status: ShipmentStatus) =>
        patchShipmentStatus(shipmentId, status),
      invalidateKeys: [shipmentKey, assignmentsKey],
      successMessage: "Estado actualizado",
    }),
  };
}
```

**Responsabilidades:**

- **Naming:** `use{Dominio}Mutations`. Cada key del objeto retornado toma el nombre de la acción (`addTrackingEvent`, `deliver`, `updateStatus`). El componente desestructura solo las que necesita.
- **Una mutation por acción.** No mezclar dos acciones en una sola mutation.
- **QueryKeys de invalidación:** listar todas las que pueden quedar stale. Como `useApiMutation` invalida con `exact: false`, alcanza con el prefijo más ancho — pero listar las específicas hace explícito qué caches están involucradas (útil para revisar al leer el código).
- **Parámetros del hook:** el contexto del dominio (`shipmentId`, `operatorClerkUserId`, etc.). **Ningún hook recibe datos del form** — eso se pasa al llamar `.mutate(...)`.

---

## 3. Services

**Archivo:** `src/services/api/shipments.ts`

```ts
import { api } from "@/lib/axios";
import type {
  ShipmentDTO,
  CreateTrackingEventBody,
  DeliverShipmentBody,
  ShipmentStatus,
} from "@/types/shipments";

export async function createTrackingEvent(
  shipmentId: string,
  data: CreateTrackingEventBody
): Promise<ShipmentDTO> {
  const response = await api.post<ShipmentDTO>(
    `/v1/shipments/${shipmentId}/tracking-events`,
    data
  );
  return response.data;
}

export async function deliverShipment(
  shipmentId: string,
  data: DeliverShipmentBody
): Promise<ShipmentDTO> {
  const response = await api.post<ShipmentDTO>(
    `/v1/shipments/${shipmentId}/deliver`,
    data
  );
  return response.data;
}

export async function patchShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus
): Promise<ShipmentDTO> {
  const response = await api.patch<ShipmentDTO>(
    `/v1/shipments/${shipmentId}/status`,
    { status }
  );
  return response.data;
}
```

**Responsabilidades:**

- Usan la instancia `api` de `@/lib/axios` (`baseURL: "/api"`).
- URL **relativa al route handler de Next**, no a un backend externo.
- **No usan try/catch.** Si algo falla, el error propaga y `useApiMutation` lo convierte en toast.
- Devuelven `response.data` tipado (el shape del DTO definido en `src/types/`).
- Cuando aplica, suman `Idempotency-Key` por intento:
  ```ts
  await api.post(url, data, { headers: { "Idempotency-Key": crypto.randomUUID() } });
  ```
  El route handler lo persiste en la columna `idempotency_key` del modelo correspondiente (Prisma rechaza el duplicado con `P2002` → 409, o devuelve el existente, según diseño del endpoint).

---

## 4. Route Handler — Prisma directo + outbound tolerante a fallos

**Archivo:** `src/app/api/v1/shipments/[shipmentId]/tracking-events/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateId } from "@/lib/ids";
import { assertTransition, eventTypeToStatus } from "@/lib/transitions";
import { handleApiError, ApiError } from "@/lib/api-error";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  event_type: z.enum([
    "picked_up", "in_transit", "out_for_delivery", "failed_delivery",
  ]),
  location: z.string().optional(),
  note: z.string().optional(),
  occurred_at: z.string().datetime(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const { shipmentId } = await params;          // ⚠️ Next 16: params es Promise
    const { userId } = await auth();
    if (!userId) throw new ApiError("UNAUTHORIZED", 401, "Login requerido");

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", 400, "Body inválido", { issues: parsed.error.issues });
    }
    const body = parsed.data;

    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new ApiError("NOT_FOUND", 404, "Shipment inexistente");

    const nextStatus = eventTypeToStatus(body.event_type);
    if (nextStatus) {
      assertTransition(shipment.status, nextStatus, "shipment");  // tira ApiError 409 si inválida
    }

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.trackingEvent.create({
        data: {
          id: generateId("evt"),
          shipmentId: shipment.id,
          eventType: body.event_type,
          location: body.location,
          note: body.note,
          occurredAt: new Date(body.occurred_at),
        },
      });

      if (nextStatus) {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: { status: nextStatus },
        });
        await tx.shipmentStatusHistory.create({
          data: {
            id: generateId("ssh"),
            shipmentId: shipment.id,
            fromStatus: shipment.status,
            toStatus: nextStatus,
            source: "logistics",
            occurredAt: new Date(body.occurred_at),
          },
        });
      }

      return event;
    });

    // ─── Sprint 1 (ADR-002): outbound diferido ───────────────────────────────
    // En sprint 2, reemplazar cada bloque por callServiceApi(...) dentro de
    // Promise.allSettled — un destino caído NO debe rollbackear el cambio local.
    logger.info({
      level: "outbound-deferred",
      target: "buyer",
      method: "PATCH",
      path: `/api/v1/orders/${shipment.orderId}/seller-groups/${shipment.orderSellerGroupId}/shipping`,
      payload: {
        shipping_status: nextStatus,
        shipment_id: shipment.id,
        tracking_number: shipment.trackingNumber,
        occurred_at: body.occurred_at,
      },
    });
    logger.info({
      level: "outbound-deferred",
      target: "seller",
      method: "PATCH",
      path: `/api/v1/sales-orders/${shipment.salesOrderId}/shipping-status`,
      payload: {
        shipping_status: nextStatus,
        shipment_id: shipment.id,
        occurred_at: body.occurred_at,
      },
    });
    // ──────────────────────────────────────────────────────────────────────────

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
```

**Responsabilidades:**

- Valida JWT con `auth()` de Clerk.
- **`params` es `Promise<...>` en Next 16** — siempre `await params`.
- Valida body con **zod** y mapea errores a `ApiError("BAD_REQUEST", 400, ..., { issues })`.
- Valida transición de estado con `assertTransition` (ver `lib/transitions.ts` — ticket T03).
- **`prisma.$transaction`** atómica para todo lo que tiene que persistirse junto (event + status update + history).
- **Outbound post-commit**: llama a las otras apps con `callServiceApi` dentro
  de `Promise.allSettled`. Los fallos agotados se registran como
  `outbound-failed`, sin cambiar la respuesta exitosa de la transición local.
- Errores siempre via `handleApiError(err)` — devuelve el shape `{ error: { code, message, details } }`.

> **Sprint 2** — cuando se reactiven los outbounds, el patrón es:
> ```ts
> await Promise.allSettled([
>   callServiceApi("buyer", `/api/v1/orders/${shipment.orderId}/seller-groups/${shipment.orderSellerGroupId}/shipping`, {
>     method: "PATCH",
>     body: { shipping_status: nextStatus, shipment_id: shipment.id, ... },
>   }),
>   callServiceApi("seller", ...),
> ]);
> ```
`allSettled` garantiza que un destino caído no rollbackee el cambio local: el
estado físico confirmado en Shipping sigue siendo la fuente de verdad. Los
fallos se loguean con `level: "outbound-failed"` para reintento manual o job.
Este es el comportamiento implementado por `notifyShipmentStatus`.

---

## 5. Uso desde un componente

```tsx
"use client";
import { useShipmentMutations } from "@/hooks/querys/shipments/useShipmentMutations";
import { Button } from "@/components/ui/button";

export function DeliverButton({ shipmentId }: { shipmentId: string }) {
  const { deliver } = useShipmentMutations(shipmentId);

  function handleDeliver(payload: DeliverShipmentBody) {
    deliver.mutate(payload, {
      onSuccess: () => {
        // side-effect del componente: cerrar dialog, navegar, etc.
      },
    });
  }

  return (
    <Button disabled={deliver.isPending} onClick={() => handleDeliver(...)}>
      {deliver.isPending ? "Procesando…" : "Marcar entregado"}
    </Button>
  );
}
```

**Notas de consumo:**

- `mutate` dispara y olvida. Si necesitás esperar el resultado para encadenar otra mutation, usá `mutateAsync` (devuelve Promise).
- `isPending` deshabilita el botón mientras corre.
- El toast de loading/success/error lo maneja `useApiMutation`; **no agregues toasts manuales** salvo casos excepcionales.
- Pasá `onSuccess` / `onError` en el segundo argumento de `.mutate()` solo para side-effects locales del componente (cerrar dialog, navegar, reset form). La invalidación de caché y los toasts ya están cubiertos por el hook.

---

## Resumen del patrón mutation

Para agregar una mutation nueva:

1. **Tipos** en `src/types/{dominio}.ts` — `CreateXBody` / `UpdateXBody` y el DTO de retorno.
2. **Route Handler** en `src/app/api/v1/.../route.ts` —
   - `await params` (Next 16).
   - `auth()` de Clerk.
   - `zod.safeParse(await request.json())`.
   - `assertTransition` si cambia status.
   - `prisma.$transaction(async tx => { ... })` para escrituras múltiples.
   - **Outbound post-commit** con `callServiceApi` + `Promise.allSettled` y log
     `outbound-failed`.
   - Cierre con `handleApiError(err)`.
3. **Service** en `src/services/api/{dominio}.ts` — función `async` con `api.post/patch/delete` tipada. `Idempotency-Key` cuando crea recurso.
4. **Hook agrupado** en `src/hooks/querys/{dominio}/use{Dominio}Mutations.ts` — agregá la acción al objeto retornado con `useApiMutation`.
5. **QueryKeys a invalidar** — reutilizá las mismas keys que usan los hooks GET del dominio (prefijo amplio).
6. **Consumo** — `const { accion } = use{Dominio}Mutations(id)` y `accion.mutate(data, { onSuccess })`.

**Regla de oro**: el componente nunca llama a `axios` ni a `prisma` directo. Siempre pasa por el hook agrupado.
