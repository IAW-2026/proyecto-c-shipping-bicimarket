# Shipping App — BiciMarket (Proyecto IAW 2026, tipo C)

## 0. informacion general del proyecto
- **se recomienda fuertemente visitar la wiki para obtener informacion clara y actualizada**: <https://proyecto-c-shipping-bicimarket.vercel.app/wiki>

## 1. Deploy de producción

**https://proyecto-c-shipping-bicimarket.vercel.app/**

## 2. Usuarios de prueba

Todos los usuarios usan la contraseña **`iawuser#`**.

| Rol | Email | Qué puede hacer |
|---|---|---|
| **Admin** | `shippadminclerktest@iaw.com` | Panel de administración: listado y detalle de todos los envíos, gestión de operadores logísticos, configuración de tarifas, reasignación de pedidos. |
| **Operador 1** | `shippoperatorclerktest@iaw.com` | Dashboard de operador: ve sus pedidos asignados, toma pedidos disponibles y avanza su estado (retiro → tránsito → reparto → entrega/fallida). |
| **Operador 2** | `shipp2operatorclerktest@iaw.com` | Igual que el operador 1, con su propio set de pedidos asignados. |

## 3. Instrucciones para evaluar

1. Entrá al deploy e iniciá sesión con cualquiera de los usuarios de arriba. El login
   rutea automáticamente según el rol (admin → `/admin/shipments`, operador →
   `/dashboard/assignments`).
2. **Como admin** podés:
   - Ver la tabla de envíos con paginación, filtros y orden (hay 16 pedidos precargados que
     cubren todos los estados).
   - Abrir el detalle de un envío y ver su historial de estados, paquetes y tracking.
   - Gestionar operadores logísticos (`/admin/operators`) y tarifas (`/admin/rates`).
3. **Como operador** podés:
   - Tomar uno de los pedidos disponibles (`ready_for_pickup` sin asignar).
   - Avanzar el estado de tus pedidos: registrar retiro, marcar en tránsito / en reparto,
     confirmar entrega (con foto de prueba) o registrar una entrega fallida.
4. **Tracking público** (sin login): la página `/track/<código>` permite seguir un pedido
   con su código `BMK-…`. Podés copiar uno desde el detalle de un envío en el panel admin.
5. **Documentación interactiva de la API** (como admin, en `/admin/api-docs`): una página
   tipo Swagger que documenta el contrato REST que Shipping **expone para las otras apps**
   (códigos postales, cotizaciones, envíos, paquetes, tracking events) con un formulario para
   **ejecutar cada endpoint en vivo**. El secreto `X-Service-Token` se inyecta del lado del
   servidor vía un proxy solo-admin, así que nunca llega al navegador.

> Si al loguear como admin terminás en el dashboard de operador, falta marcar al usuario
> admin en Clerk. Ver la nota en la sección 5.

## 4. Descripción del proyecto

**Shipping App** es el módulo de envíos y logística de **BiciMarket**, un marketplace de
bicicletas y accesorios compuesto por cuatro aplicaciones independientes (Buyer, Seller,
**Shipping** y Payments). Esta app es la dueña de los envíos (`shipments`), los grupos de
envío por pedido, los paquetes, los eventos de tracking y los operadores logísticos. Las
apps se comunican entre sí únicamente por REST con un header `X-Service-Token`.

El stack es **Next.js 16** (App Router) + **React 19** + **TypeScript**, con **Prisma 6**
sobre **PostgreSQL** (Supabase), autenticación con **Clerk**, **TanStack Query** + **axios**
en el frontend y **shadcn** + **Tailwind 4** para la UI. El deploy corre en Vercel.

El dominio modela el flujo real de un marketplace multi-vendedor: un pedido del comprador se
descompone en N envíos (uno por vendedor), agrupados en un `ShipmentGroup` que lleva el
tracking global que ve el comprador. Cada envío sigue una máquina de estado estricta
(`ready_for_pickup → picked_up → in_transit → out_for_delivery → delivered`, con ramas a
`failed_delivery` y `returned`). Un operador logístico toma el pedido completo y va
avanzando su estado desde la app.

Esta entrega corresponde al **Sprint 1**, en el que la app corre de forma **standalone**:
las llamadas salientes a las otras apps están diferidas (se loguean en vez de ejecutarse) y
los datos que en producción vendrían de Seller/Buyer/Payments están mockeados localmente.
La lógica propia de Shipping (envíos, asignaciones, tracking, tarifas) funciona end-to-end.

## 5. Notas para la corrección

- **Modelo de roles**: no hay columna `role` en la DB. Un usuario es **operador** si existe
  un `LogisticsOperator` activo con su `clerk_user_id` (lo crea el seed) y es **admin** si
  tiene `publicMetadata.admin = true` en Clerk. El admin de prueba ya viene marcado; si por
  algún motivo no lo estuviera, se setea con `npm run set-admin` (usa la `CLERK_SECRET_KEY`
  del `.env`) o a mano en el Clerk Dashboard del usuario admin.
- **Datos precargados**: el seed (`prisma/seed.ts`) carga la tarifaria canónica de 150 filas,
  8 operadores ficticios y dos datasets coordinados con Buyer/Seller/Payments: 60 pedidos,
  76 envíos y cobertura completa de la máquina de estados. `npm run db:seed` limpia y
  reconstruye los datos; `npm run db:reset` recrea primero el esquema desde migraciones.
- **Decisiones de diseño**:
  - `ShipmentGroup` agrupa los N envíos de un pedido y es dueño del tracking global
    (`BMK-…`) y del estado consolidado; la asignación del operador vive a nivel grupo.
  - **Snapshots inmutables** para datos cuya verdad vive en otra app (direcciones, precios).
  - **IDs con prefijo** estilo Stripe (`shp_`, `qte_`, `pkg_`, `grp_`, …) e **idempotencia**
    por `Idempotency-Key` en los POST que crean recursos.
  - Transiciones de estado inválidas devuelven `409 INVALID_TRANSITION`.
  - **API docs interactiva** (`/admin/api-docs`): documentación tipo Swagger del contrato
    S2S que Shipping expone (SH1–SH4), con un playground que ejecuta cada endpoint a través
    de un proxy solo-admin que inyecta el `X-Service-Token` server-side.
- **Limitaciones conocidas**: Sprint 1 standalone (outbound diferido + datos externos
  mockeados, ADR-002); en desarrollo `AUTO_PROVISION_OPERATORS=true` crea el operador
  on-login si no existe.
- **Documentación extendida**: ver la carpeta [`docs/`](./docs) (modelo de datos, APIs,
  máquina de estado, flujos de frontend) y [`AGENTS.md`](./AGENTS.md).

---

Enunciado del proyecto: <https://iaw-2026.github.io/proyecto/>
