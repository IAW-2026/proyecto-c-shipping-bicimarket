<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Contexto para agentes AI — BiciMarket

> Primer punto de entrada para un agente AI que trabaje en un fork de este template. La fuente de verdad detallada vive en `proyecto-c-etapa-1-bicimarket/preview/`.

## Qué es este repo

Template Next.js + Prisma + Clerk para forkear como base de cada una de las 4 apps del marketplace BiciMarket: **Buyer**, **Seller**, **Shipping**, **Payments** (eventualmente Feedback). Cada dev hace fork, configura su propio Clerk y su propia Postgres, y reemplaza el modelo `User` de Prisma por las entidades de **su** app.

## Reglas que NO se rompen

1. **Solo REST clásico** entre apps (`GET`/`POST`/`PUT`/`PATCH`/`DELETE`). No hay webhooks entre nuestras apps, no hay colas, no hay event bus. El único webhook real es el de Mercado Pago hacia Payments.
2. **Cada app tiene su propio Clerk**. La identidad de un mismo humano en otra app se correlaciona por email + `user_links` (solo Payments y Feedback necesitan esa tabla).
3. **Provisioning perezoso de usuarios**: en el primer login, el middleware/page lee el JWT y hace upsert en la DB local. No usar webhook de Clerk.
4. **Auth de llamadas inter-apps**: `X-Service-Token: <secret>`. Patrón en `src/lib/service-auth.ts`.
5. **Versionado de API**: prefijo `/api/v1/...` para endpoints de negocio. `/api/internal/...` para endpoints server-to-server. `/webhooks/...` solo para externos (Mercado Pago).
6. **Snapshots inmutables** cuando una app guarda datos cuya verdad vive en otra (precio, dirección, nombre): nunca actualizarlos.
7. **Montos en centavos** (`amount_cents: int`). Currency siempre `"ARS"`.
8. **IDs con prefijo** estilo Stripe: `ord_…`, `prd_…`, etc.
9. **Formato de error** uniforme: `{ "error": { "code": "...", "message": "...", "details": {} } }`.
10. **Idempotencia**: POST que crea recursos acepta `Idempotency-Key`.

## Flujos críticos a respetar

- **Compra multi-vendedor**: Buyer dueña del `order_id`. Una `order` se descompone en N `order_seller_groups`. Una `sales_order` por seller en Seller. Un `shipment` por seller en Shipping. Una `settlement` por seller en Payments (todas dentro del mismo `payment`).
- **Stock**: solo se descuenta cuando Mercado Pago aprueba el pago, no al agregar al carrito.
- **Liquidación al vendedor**: se dispara con la **entrega confirmada** del envío, no con la aprobación del pago.

## Cómo decidir dónde poner código nuevo

| Tipo de código | Carpeta |
|---|---|
| Endpoint público de negocio | `src/app/api/v1/<recurso>/route.ts` |
| Endpoint server-to-server | `src/app/api/internal/<recurso>/route.ts` |
| Webhook externo (solo Payments con MP) | `src/app/webhooks/mercadopago/route.ts` |
| Helper compartido | `src/lib/` |
| Modelo de datos | `prisma/schema.prisma` |
| Página protegida | `src/app/<ruta>/page.tsx` (auth.protect via middleware) |

## Antes de proponer cambios

1. Leer la doc relevante en `proyecto-c-etapa-1-bicimarket/preview/`.
2. Si el cambio afecta el contrato con otras apps, actualizar `preview/03-apis.md` en el mismo PR.
3. Validar que el endpoint nuevo respete las convenciones de §0 de `preview/03-apis.md` (headers, paginación, errores, idempotencia).
