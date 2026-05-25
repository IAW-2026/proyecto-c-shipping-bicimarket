<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Contexto para agentes AI — Shipping App (BiciMarket)

> Primer punto de entrada para cualquier agente AI que trabaje en este repo. Detalles de Shipping App en `docs/` (ver §"Mapa de docs").

## Qué es este repo

**Shipping App** de BiciMarket — una de las 4 webapps del marketplace (Buyer / Seller / **Shipping** / Payments). Owner: Enrique Seitz. Esta app es dueña de los `shipments`, paquetes, eventos de tracking y operadores logísticos. Las apps se comunican entre sí **solo por REST con `X-Service-Token`**.

Stack (confirmado en `package.json`):
- **Next 16.2.3** App Router + React 19 + TypeScript 5 + Turbopack
- **Prisma 6.19** (cliente en `src/generated/prisma`)
- **PostgreSQL** en Supabase (solo Postgres, sin SDK/auth/storage de Supabase)
- **Clerk 7.1** (`@clerk/nextjs`) — auth + middleware
- **TanStack Query 5.99** + Devtools
- **axios 1.15** (frontend) + `fetch` (server-to-server inter-apps)
- **sonner 2.0** para toasts
- **shadcn 4** + Tailwind 4
- **react-hook-form 7 + zod 4** para forms
- **zustand 5** para client state
- **Docker** multi-stage (Dokploy host TBD)

---

## Reglas que NO se rompen

### Sistema y comunicación

1. **Solo REST clásico** entre apps (`GET`/`POST`/`PUT`/`PATCH`/`DELETE`). No hay webhooks entre nuestras apps, no hay colas, no hay event bus. El único webhook real es el de Mercado Pago hacia Payments (no nos toca a Shipping).
2. **Cada app tiene su propio Clerk**. Shipping usa `shipping.bicimarket`. Sin identidad cruzada entre Clerks.
3. **Provisioning perezoso de usuarios**: en el primer request autenticado, el middleware/page lee el JWT y hace upsert en la DB local. No usar webhook de Clerk. Patrón en `src/lib/auth.ts:getOrCreateLocalUser()`.
4. **Auth de llamadas inter-apps**: `X-Service-Token: <secret>`. Patrón en `src/lib/service-auth.ts` (`requireServiceToken` para inbound, `callServiceApi` para outbound).
5. **Versionado de API**: prefijo `/api/v1/...` para endpoints de negocio. `/api/internal/...` para endpoints server-to-server puros (sin equivalente público). `/api/health` para healthcheck. **No** hay `/webhooks/` en Shipping.
6. **Snapshots inmutables** cuando guardamos datos cuya verdad vive en otra app (precio, dirección, nombre): nunca actualizarlos.
7. **Montos en centavos** (`amount_cents: int`). Currency siempre `"ARS"`.
8. **IDs con prefijo** estilo Stripe — prefijos propios de Shipping: `shp_`, `qte_`, `pkg_`, `evt_`, `dla_`, `prf_`, `lop_`, `rat_`, `ssh_`. Refs opacas a otras apps: `ord_`, `osg_`, `sor_`, `slp_`, `byp_`, `pay_`.
9. **Formato de error** uniforme: `{ "error": { "code": "...", "message": "...", "details": {} } }`.
10. **Idempotencia**: POST que crea recursos acepta `Idempotency-Key`. Para shipments y shipping_quotes hay columna `idempotency_key @unique` en la DB.
11. **Estado de envío** sigue la máquina de estado de `docs/06-estados-y-diagramas.md §3`. Transiciones inválidas → `409 INVALID_TRANSITION` con `details: { from, to, allowed }`.

### Sprint 1 — App standalone (ADR-002)

12. **Outbound a otras apps DIFERIDO**. Cualquier `callServiceApi` saliente está reemplazado por `logger.info({ level: "outbound-deferred", target, method, path, payload })` dentro del route handler. La lógica local (Prisma) se ejecuta igual. En sprint 2 se reactiva.
13. **Hidratación de datos de otras apps MOCKEADA**. Lo que en sprint 2 vendría de Seller/Buyer/Payments hoy se obtiene de `src/lib/mocks.ts` (ej: `getMockPickupAddress(sellerProfileId)`).

### Frontend (Next + TanStack + axios + sonner + shadcn)

14. **Toda interacción con DB o servicio externo pasa por un route handler en `src/app/api/`**. El frontend nunca llama directo a Prisma ni a APIs de otras apps.
15. **Interno (Shipping ↔ Shipping DB)** → el route handler usa `prisma` directo de `@/lib/prisma`. **Externo (Shipping → otra app)** → el route handler usa `callServiceApi` de `@/lib/service-auth` (sprint 2; sprint 1 mockea).
16. **Frontend → backend** siempre con la instancia `api` de `@/lib/axios` (`baseURL: "/api"`). Nunca `fetch` crudo desde el componente.
17. **Toda consulta GET** → hook con `useQuery` de TanStack Query. **Un hook por GET** (`useShipment(id)`, `useMyAssignments()`, `useShipmentsAdmin(...)`).
18. **Toda mutation** → `useApiMutation` (helper en `src/hooks/querys/common/useApiMutation.tsx`). **Un hook agrupado por dominio** (`useShipmentMutations(id)` devuelve `{ deliver, addTrackingEvent, updateStatus, ... }`).
19. **Notificaciones** → sonner (`toast.success`, `toast.error`, `toast.loading`). El helper `useApiMutation` ya las maneja; no agregar toasts manuales salvo casos especiales.
20. **Validación de body en route handlers** → siempre con `zod` (`safeParse` + mapear errores a `ApiError("BAD_REQUEST", 400, ..., { issues })`).
21. **Interfaces tipadas** viven en `src/types/{dominio}.ts`. Nunca inline en hooks o componentes. Sufijos: `XDTO` (forma del JSON de nuestra API), `XApi` (forma cruda de API externa, solo en adapters), `CreateXBody`/`UpdateXBody`.

---

## Flujos críticos del marketplace (contexto para entender)

- **Compra multi-vendedor**: Buyer dueña del `order_id`. Una `order` se descompone en N `order_seller_groups`. Una `sales_order` por seller en Seller. **Un `shipment` por seller en Shipping**. Una `settlement` por seller en Payments (todas dentro del mismo `payment`).
- **Liquidación al vendedor**: se dispara cuando **Shipping** marca un envío como `delivered` (no cuando el pago se aprueba). Por eso `POST /api/v1/internal/shipment-delivered` a Payments es crítico.
- **Cotización**: la quote de Shipping vive 60 minutos. Cuando Seller crea el `shipment`, Shipping valida que la quote no esté vencida.

---

## Cómo decidir dónde poner código nuevo

### Backend (Next route handlers + Prisma)

| Tipo de código | Carpeta |
|---|---|
| Endpoint público (UI logueada o S2S de otras apps) | `src/app/api/v1/<recurso>/route.ts` |
| Endpoint server-to-server interno (sin equivalente público) | `src/app/api/internal/<recurso>/route.ts` |
| Healthcheck | `src/app/api/health/route.ts` (ya existe) |
| Helpers transversales (auth, errors, prisma client, ids, transitions, pagination, idempotency, logger, mocks) | `src/lib/` |
| Modelo de datos | `prisma/schema.prisma` (cliente regenerado en `src/generated/prisma`) |
| Página protegida | `src/app/(auth-group)/<ruta>/page.tsx` (auth via middleware) |

### Frontend (componentes, hooks, services, types, adapters)

| Tipo de código | Carpeta |
|---|---|
| Componentes shadcn base | `src/components/ui/` (los maneja shadcn CLI) |
| Componentes compuestos (tablas, filtros, layouts) | `src/components/{recurso}/` o `src/components/data-table/` para los genéricos |
| Hook GET (uno por recurso) | `src/hooks/querys/{dominio}/use{Recurso}.ts` |
| Hook agrupado de mutations (uno por dominio) | `src/hooks/querys/{dominio}/use{Dominio}Mutations.ts` |
| Helper genérico de mutations | `src/hooks/querys/common/useApiMutation.tsx` |
| Servicios axios (uno por dominio) | `src/services/api/{dominio}.ts` |
| Tipos / interfaces | `src/types/{dominio}.ts` |
| Adapter (forma cruda → DTO; raro en sprint 1) | `src/adapters/{dominio}.ts` |
| Cliente state (zustand) | `src/store/{dominio}.ts` |

---

## Mapa de docs (`docs/`)

Cada doc es la fuente de verdad de su tema dentro de Shipping. La copia "canónica" multi-app del grupo vive en `proyecto-c-etapa-1-bicimarket/docs/`; estas son las versiones recortadas a Shipping.

| Doc | Cubre |
|---|---|
| `01-descripcion.md` | Qué es BiciMarket, restricción stock ilimitado, flujos donde Shipping participa. |
| `02-responsabilidades.md` | Reglas transversales del sistema + sección de Shipping (datos propios, compromisos, lo que consume/recibe). |
| `03-apis.md` | API completa de Shipping (SH1–SH5) + contratos referenciados (CR1–CR4) que Shipping toca de otras apps. |
| `04-modelo-de-datos.md` | DB completa de Shipping (9 tablas), reglas comunes, máquina de estado de `shipment.status`, snapshots. |
| `05-usuarios.md` | Clerk-Shipping, provisioning perezoso, claims del JWT, alta del operador logístico. |
| `06-estados-y-diagramas.md` | Máquina de estado `shipment.status`, diagrama de entrega fallida, tabla normativa de transiciones permitidas. |
| **`07-flujo-get-endpoint.md`** | **Patrón obligatorio para consumir GETs desde el frontend.** Componente → Hook → Service → Route Handler → Prisma. |
| **`08-flujo-mutations.md`** | **Patrón obligatorio para mutations.** Componente → `useDominioMutations` → `useApiMutation` → Service → Route Handler (Prisma `$transaction` + outbound diferido). |
| **`09-tablas-server-side.md`** | **Patrón para tablas con paginación / filtros / sort en server.** URL como fuente de verdad, `<DataTable>` genérico, `<ServerSortButton>`, `FilterConfig`. |

---

## Antes de proponer cambios

1. Leer la doc relevante en `docs/`.
2. Si el cambio afecta el contrato con otras apps (lo que Shipping expone o lo que llama), actualizar `docs/03-apis.md` en el mismo PR. Si el cambio es estructural, también actualizar el repo canónico del grupo en `proyecto-c-etapa-1-bicimarket/docs/`.
3. Validar que el endpoint nuevo respete las convenciones de §0 de `docs/03-apis.md` (headers, paginación, errores, idempotencia).
4. Si tocás el flujo de datos en el frontend, releé las docs 07/08/09 — la convención es estricta (un hook por GET, un hook agrupado por dominio para mutations, `useApiMutation` siempre).
5. **Nunca** llamar a Prisma o `axios` directo desde un componente — siempre vía hook.
6. **Nunca** crear toasts manuales para flujos de mutation — el helper los maneja.

---

## Convenciones de código rápidas

- **Next 16**: `params` y `searchParams` son `Promise<...>` → siempre `await`.
- **Clerk 7**: `auth()` y `currentUser()` son async → siempre `await`.
- **Prisma**: cliente importado de `@/lib/prisma` (singleton con global cache para HMR). Cliente generado en `src/generated/prisma`, no en `node_modules/.prisma`.
- **IDs**: generar con helper `generateId("shp" | "qte" | ...)` de `@/lib/ids` (T03). Nunca `cuid()` crudo.
- **Errores**: lanzar `new ApiError(code, status, message, details?)` de `@/lib/api-error` (T03) y dejar que `handleApiError(err)` los serialice en el `catch` del route handler.
- **Transacciones Prisma**: `prisma.$transaction(async (tx) => { ... })` para cualquier conjunto de escrituras que debe ser atómico (ej: crear tracking_event + update shipment.status + insert en status_history).
- **Outbound diferido (sprint 1)**: `logger.info({ level: "outbound-deferred", target, method, path, payload })` en lugar de `callServiceApi`.
