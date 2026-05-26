# 1.11 — Pantallas (pre-desarrollo) — Shipping App

> **Tipo C — Marketplace · BiciMarket · Shipping App**
> Mapeo 1:1 entre cada PNG aprobada por diseño en `desing -references/` y la ruta Next que la materializa, con la descomposición de componentes que cada pantalla requiere. La idea es que cualquier persona (o agente) que abra este doc pueda implementar una pantalla cualquiera sin tener que reinterpretar el PNG ni leer los 10 docs de fondo.
>
> Esta es la fuente de verdad de **qué pantallas existen, qué muestran y qué referencia visual le corresponde a cada una**. Patrones de implementación (GET, mutations, tablas server-side) en `07/08/09`. Design tokens y composición visual en `10`.

---

## Context

El proyecto **Shipping App** (Next 16 + Prisma + Clerk) ya tiene scaffold de auth, mocks, DB, hooks, services y un primer pase de `/admin/shipments`. Falta materializar **todas las pantallas reales del producto** que la diseñadora aprobó en Claude Design — ya están exportadas como PNGs en `desing -references/` (26 imágenes que cubren ~12 pantallas con sus estados loading/empty/error/success).

**Resultado esperado**: 12 rutas funcionales (5 admin + 4 operador + 3 errores + landing), siguiendo los patrones obligatorios de `docs/07` (GET), `docs/08` (mutations) y `docs/09` (tablas server-side), respetando el design system de `docs/10`.

**Sprint 1 (ADR-002)** — outbound a otras apps **diferido** (logs `outbound-deferred`), datos de otras apps **mockeados** (`lib/mocks.ts`). No se implementan páginas que dependan exclusivamente de info de otras apps.

---

## 1. Mapa maestro de pantallas → referencias

| # | Ruta Next | Pantalla | Reference PNG(s) | Estados que cubre |
|---|---|---|---|---|
| 1 | `/` | Landing pública pre-login | `Landing.png` | Único estado |
| 2 | `/dashboard` | Hub del operador (redirect a `/dashboard/assignments`) | — (shell compartido con #3) | — |
| 3 | `/dashboard/assignments` | Mis envíos (operador, mobile) | `operador-mis-envios/Lista _ 5 env_os.png`, `Lista _ operador nuevo.png`, `Empty _ al d_a.png`, `Loading _ skeleton.png`, `Success _ post-delivery toast.png` | Normal · pocos · empty · loading · post-success |
| 4 | `/dashboard/shipments/[id]` | Detalle de envío del operador (mobile) | `operador-detalle-de-envio/Status _ A retirar.png`, `Status _ En tr_nsito.png`, `Status _ En reparto.png`, `Confirm sheet _ retiro.png`, `Modal _ Confirmar entrega.png` | A retirar · En tránsito · En reparto · Sheet pickup · Modal delivery |
| 5 | `/admin/shipments` | Tabla admin de envíos (desktop) | `admin-envios/Tabla _ estado normal.png`, `Tabla _ loading skeleton.png`, `Empty _ sin data.png`, `Empty _ con filtros.png`, `Error _ fallo de red.png` | Normal · loading · empty global · empty con filtros · error |
| 6 | `/admin/shipments/[id]` | Detalle admin de envío (desktop) | `admin-envios/Detalle de env_o.png`, `Detalle _ modal reasignar.png` | Detalle · modal reasignar |
| 7 | `/admin/operators` | Tabla de operadores (desktop) | `admin-operador/Tabla de operadores.png` | Normal (loading/empty se derivan) |
| 8 | `/admin/operators/new` | Form alta de operador | `admin-operador/Form _ Nuevo operador.png`, `Form _ con errores de validaci_n.png` | Pristine · con errores |
| 9 | `/admin/operators/[id]` | Detalle de operador | `admin-operador/Detalle de operador.png` | Único estado |
| 10 | `not-found.tsx` (global) | 404 | `404 _ Not found.png` | Único |
| 11 | `forbidden/page.tsx` o `error.tsx` 403 | 403 | `403 _ Forbidden.png` | Único |
| 12 | `error.tsx` (global) | 500 | `500 _ Server error.png` | Único |

**Referencia interna de diseño (no es pantalla)**: `Status sheet _ shipment _ operator.png` → se materializa como `src/lib/status-styles.ts` (mapping `Record<ShipmentStatus, { label, variant, classes, dot }>` + análogo para `OperatorStatus` y `ServiceLevel`). **Esta es la pieza más importante**: la consumen TODAS las pantallas con badges.

---

## 2. Infraestructura compartida (a crear ANTES que las pantallas)

### 2.1 `src/lib/status-styles.ts` — fuente de verdad de chips
- **Shipment status** (8): `created`, `ready_for_pickup` (outline), `picked_up` (info celeste), `in_transit` (info-strong azul), `out_for_delivery` (warning naranja), `delivered` (success verde), `failed_delivery` (warning-strong naranja-rojo), `returned` (destructive).
- **Operator status** (3): `active` (primary verde-teal), `inactive` (muted), `suspended` (destructive).
- **Service level** (3): `standard` (muted), `express` (info azul), `same_day` (primary).
- Cada entrada: `{ label: string (es-AR), variant: BadgeVariant, classes: string (Tailwind), dot?: boolean }`. Classes según `docs/10 §3.3`.
- Helper `getStatusLabel(status)` / `getStatusVariant(status)` / `<StatusBadge status>` envoltorio sobre `Badge` shadcn.

### 2.2 Layouts maestros

**Admin** (`src/app/(admin)/layout.tsx`) — **reemplazar el placeholder actual** por la shell desktop de los mockups:
- Sidebar fijo 240px oscuro (`bg-sidebar`) con logo "BiciMarket · Logística" + chip `ADMIN`, nav `Truck` Envíos / `Users` Operadores con badges de count (livianos — opcionalmente vía hooks `useShipmentsCount`/`useOperatorsCount` o hardcodeados a `0` en sprint 1).
- Footer del sidebar: avatar Clerk + email + `LogOut` (UserButton).
- Topbar 50px con breadcrumb dinámico + search `⌘K` (visual sólo en sprint 1).
- Content `max-width: 1400px`, padding 32px.
- En `<1024px` sidebar se vuelve `Sheet` (shadcn).
- Reutiliza `Sidebar` shadcn ya instalado.

**Operador** (`src/app/dashboard/layout.tsx` — crear; el `dashboard/page.tsx` actual se convierte en redirect):
- Mobile-first centrado `max-width: 480px` aún en desktop.
- Header 56px sticky: logo "BiciMarket · Logística" + `● En turno` chip verde + `UserButton`.
- Sin sidebar.
- Toaster global ya viene del root layout.

### 2.3 Componentes nuevos a crear en `src/components/`

| Componente | Path | Para qué |
|---|---|---|
| `StatusBadge` | `components/status/StatusBadge.tsx` | Renderiza badge desde `status-styles.ts`. Usado en todas las cards/tablas/headers. |
| `KpiCard` | `components/admin/KpiCard.tsx` | Las 4 cards arriba de tabla admin (label, valor, delta, sparkline opcional). Sparkline con `recharts` o SVG simple (chart shadcn ya está instalado). |
| `EmptyState` | `components/feedback/EmptyState.tsx` | Card grande centrada con icono Lucide + título + subtítulo + CTAs opcionales. Variantes: `icon`, `variant: "info" \| "neutral"`. |
| `ErrorBanner` | `components/feedback/ErrorBanner.tsx` | Banner inline rosa con icono `AlertCircle` + título + subtítulo + botón Reintentar. |
| `ErrorPageLayout` | `components/feedback/ErrorPageLayout.tsx` | Card central usada por 403/404/500 con eyebrow + título + subtítulo + CTA + slot para error ID (500). |
| `AddressCard` | `components/shipping/AddressCard.tsx` | Card con pin verde (`MapPin`) o casa azul (`Home`) + street + city/postal + meta secundaria + link "Abrir en Maps". |
| `TrackingTimeline` | `components/shipping/TrackingTimeline.tsx` | Lista cronológica con dot + label + location + nota + relative time. Acepta `events: TrackingEventDTO[]`. |
| `ShipmentMobileCard` | `components/operator/ShipmentMobileCard.tsx` | Card del listado del operador: badge + tracking + retiro/entrega + meta (peso, bultos, hace X) + CTA full-width cuya etiqueta deriva del status. |
| `OperatorAvatar` | `components/operator/OperatorAvatar.tsx` | Avatar con iniciales + status dot. |
| `VehicleIcon` | `components/operator/VehicleIcon.tsx` | Mapea `vehicle_type` → `Bike`/`Car`/`Truck` Lucide. |
| `AssignOperatorDialog` | `components/admin/AssignOperatorDialog.tsx` | Dialog del mockup "reasignar": warning banner condicional + search + lista de operadores activos con assignments activos count + footer. Hace POST/PATCH a `/api/v1/shipments/:id/assignments`. |
| `OverrideStatusDialog` | `components/admin/OverrideStatusDialog.tsx` | Dialog que llama `PATCH /api/v1/shipments/:id/status` con `select` de status válidos + textarea note. |
| `DeliveryConfirmSheet` | `components/operator/DeliveryConfirmSheet.tsx` | Bottom sheet con foto obligatoria (input file capture=environment → base64), nota opcional, hint "firma próximamente". Llama `POST /api/v1/shipments/:id/deliver`. |
| `PickupConfirmSheet` | `components/operator/PickupConfirmSheet.tsx` | Sheet liviano sin evidencia. Llama `POST /api/v1/shipments/:id/tracking-events` con `picked_up`. |
| `TransitionButton` | `components/operator/TransitionButton.tsx` | Botón sticky/CTA cuya label e icono dependen del status actual del shipment, abre el sheet/modal correcto. |
| `AuditHistoryTable` | `components/admin/AuditHistoryTable.tsx` | Tabla `from → to · source · ts · payload (expandible)` desde `ShipmentStatusHistory`. |

### 2.4 Hooks / services / endpoints faltantes

Ya existen: `useMyAssignments`, `useShipment`, `useShipmentMutations`, `useShipmentsAdmin`, `useShipmentsByOrder`, `useTrackingEvents`, `useLogisticsOperators`, `useLogisticsOperatorMutations`, `useAssignmentMutations`.

**Falta crear** (siguiendo `docs/07` y `docs/08`):

- `useLogisticsOperator(id)` GET detalle + service `getLogisticsOperator(id)` + route `GET /api/v1/logistics-operators/[operatorId]/route.ts`.
- `useShipmentStatusHistory(id)` GET historial + service + route `GET /api/v1/shipments/[shipmentId]/status-history/route.ts` (la tabla `shipment_status_history` ya existe).
- `useShipmentsKpis()` GET KPIs (counts por status del día/30d) + service + route `GET /api/v1/shipments/kpis/route.ts`. Devuelve `{ active, delivered_today, failed_30d, returned_30d, sparkline?: number[] }`.
- `useOperatorsKpis()` análogo: `{ active, suspended, active_assignments, avg_deliveries_30d }`.
- `useOperatorPerformance(id)` GET últimos 30 días — devuelve `{ delivered, failed, success_rate, daily: { date, delivered, failed }[] }`.
- `useOperatorActiveAssignments(id)` GET mini lista para el detalle de operador.
- `addPackage` ya está cubierto; **crear** `useShipmentAdminMutations` con `overrideStatus`, `assignOperator`, `reassignOperator` agrupando las mutations admin del detalle.

Cada route handler sigue el patrón estricto: `auth()` → `isAdmin()` cuando aplique → `zod.safeParse` (mutations) → `prisma.$transaction` cuando haya escritura múltiple → `handleApiError`. Ninguna llamada cross-app — lo que hoy vendría de Buyer/Seller (nombre del buyer, dirección de retiro) se obtiene del snapshot ya persistido en `shipments` (`shipping_address_snapshot`, `pickup_address_snapshot`) — **sin necesidad de mocks**.

---

## 3. Pantallas — especificación detallada

> Para cada pantalla: ruta, qué referencia(s) la cubren, layout, datos consumidos, componentes que usa, estados a manejar y reglas de mutación. Los detalles del PNG ya están documentados; este bloque es la receta para escribir el código.

### 3.1 Landing pública (`/`) — `Landing.png`

- **Ruta**: `src/app/page.tsx` (ya existe, **reescribir**).
- **Server Component**. Si `auth().userId` existe → redirect a `/dashboard`.
- **Layout**: centrado vertical/horizontal, sin sidebar. Card central `max-width: 480px`.
- **Componentes**: logo + link externo `bicimarket.com`, icono `Package` en cuadrado rosa, título 2 líneas, subtítulo gris, CTA `<Button>` → `/sign-in`, link "Soporte" (mailto o anchor `#`), pill `● Servicios operativos · v2.4.0` (versión hardcoded desde `package.json` en sprint 1), footer `© 2026 BiciMarket S.A. · Términos · Privacidad`.
- **Estados**: único.

### 3.2 Dashboard operador (`/dashboard`) — redirect

- **Ruta**: `src/app/dashboard/page.tsx` (ya existe — **simplificar**).
- Reescribir como Server Component que hace `redirect("/dashboard/assignments")` después de validar `getOrCreateLocalUser()`.
- El layout de operador (§2.2) se aplica en `src/app/dashboard/layout.tsx`.

### 3.3 Mis envíos (`/dashboard/assignments`) — `operador-mis-envios/*`

- **Ruta**: `src/app/dashboard/assignments/page.tsx` (crear).
- **Server Component liviano**: valida operador activo (vía `getOrCreateLocalUser` + chequeo de `LogisticsOperator.status === 'active'`; si no es activo → redirect a `/forbidden`).
- **Client Component** `<MyAssignmentsClient />` que:
  - Llama `useMyAssignments()` ya existente.
  - Header sticky: "Mis envíos · Buen día, {firstName} · N activo(s)" + `RefreshCw` (refetch).
  - Tabs horizontales pills: `Todos · N`, `A retirar · N`, `En curso · N`, `En reparto · N`. Filtra el array en cliente — no requiere refetch.
  - Render condicional:
    - `isLoading && !data` → 3× `<ShipmentMobileCard.Skeleton />` + skeleton de pills (cubre `Loading _ skeleton.png`).
    - `data.length === 0` → `<EmptyState icon={PackageCheck} title="Al día, no tenés envíos asignados" subtitle="…" cta={{label:"Refrescar", onClick:refetch}}/>` (cubre `Empty _ al d_a.png`).
    - `data.length === 1` → un solo card + hint pull-to-refresh debajo (cubre `Lista _ operador nuevo.png`).
    - `data.length >= 2` → lista (cubre `Lista _ 5 env_os.png`).
  - Pull-to-refresh nativo: simple — interceptar `touchstart/touchmove` y disparar `refetch()` (puede omitirse en sprint 1 si toma tiempo; el botón `RefreshCw` ya cubre el caso).
  - Toast post-delivery: cuando llega de `/dashboard/shipments/[id]` tras delivery exitoso, queda persistente por sonner (no requiere lógica especial — el `useApiMutation` ya disparó `toast.success`); cubre `Success _ post-delivery toast.png` automáticamente.
- **Componente** `<ShipmentMobileCard assignment>`:
  - `<StatusBadge status>` arriba derecha, tracking number mono grande izquierda.
  - `<AddressCard variant="pickup">` (1 línea, truncada) + `<AddressCard variant="delivery">` (idem).
  - Meta row: `Package` peso · `Boxes` bultos · `Clock` "hace 3 h" (usar `Intl.RelativeTimeFormat` o `lib/format.ts`).
  - CTA full-width verde cuya label deriva de `status`:
    - `ready_for_pickup` → "Ir a retirar" (abre `<PickupConfirmSheet>`).
    - `picked_up` → "Marcar en tránsito" (mutation directa `addTrackingEvent({event_type:'in_transit'})`).
    - `in_transit` → "Marcar en reparto" (mutation directa `addTrackingEvent({event_type:'out_for_delivery'})`).
    - `out_for_delivery` → "Marcar entregado" (link a `/dashboard/shipments/[id]` con `?action=deliver` ó abre el modal inline).
  - Toda la card (excepto el botón) es link a `/dashboard/shipments/[id]`.

### 3.4 Detalle envío operador (`/dashboard/shipments/[id]`) — `operador-detalle-de-envio/*`

- **Ruta**: `src/app/dashboard/shipments/[id]/page.tsx` (crear).
- **Server Component**: `await params`, valida que el shipment exista y esté asignado al operador logueado (via `delivery_assignments`); si no → 403.
- **Client Component** `<OperatorShipmentDetail shipmentId>`:
  - Header sticky: `ChevronLeft` (router.back), tracking mono centrado, `<StatusBadge>` top-right.
  - Fila secundaria: `SERVICIO {service_level} · COMPRADOR {buyer name del shipping_address_snapshot}`.
  - **Mapa** (mockup estilizado): placeholder div con `≈ 8,4 km` calculado del backend (sprint 1 hardcode `null`) — se puede dejar `<MapPlaceholder>` simple sin integración real.
  - `<AddressCard variant="pickup">` con nombre del seller (snapshot) + link "Abrir en Maps" (`https://maps.google.com/?q=${encodeURIComponent(addr)}`).
  - `<AddressCard variant="delivery">` con "Recibe {buyer_name}" + Maps link.
  - Card DETALLE: producto (de `packages[0].description`), bultos expandible con dimensiones, peso `Intl.NumberFormat`, carrier.
  - `<TrackingTimeline events={trackingEvents}>` — acumulativo según status (cubre las 3 variantes `Status _ A retirar`, `En tránsito`, `En reparto` con sólo cambiar la data).
  - CTA sticky bottom — `<TransitionButton shipment>`:
    - `ready_for_pickup` → abre `<PickupConfirmSheet>` (cubre `Confirm sheet _ retiro.png`).
    - `picked_up` → "Marcar en tránsito" (mutation directa, sin sheet).
    - `in_transit` → "Marcar en reparto" (mutation directa).
    - `out_for_delivery` → abre `<DeliveryConfirmSheet>` (cubre `Modal _ Confirmar entrega.png`).
    - `delivered`/`returned` → CTA hidden, mostrar pill verde "Envío finalizado".
- **`<PickupConfirmSheet>`**: bottom sheet shadcn `Sheet` side=bottom, drag handle, resumen `tracking · peso`, botón "✓ Sí, marcar retirado" → `addTrackingEvent({event_type:'picked_up', occurred_at:new Date().toISOString()})`, link Cancelar.
- **`<DeliveryConfirmSheet>`**: sheet más alto. Input foto: `<input type="file" accept="image/*" capture="environment">`; al cambiar, leer con `FileReader.readAsDataURL` → `data:image/jpeg;base64,…` (string). Preview + botón "↻ Retomar foto". Textarea nota. Bloque info "Firma del receptor — próximamente" (disabled). Botón "✓ Confirmar entrega" disabled si no hay foto → `deliver.mutate({ proof_photo_url: base64, note, occurred_at: new Date().toISOString() })`. Al éxito → router.push("/dashboard/assignments") (el toast persiste).
- **Datos consumidos**: `useShipment(id)`, `useTrackingEvents(id)`, `useShipmentMutations(id)`.

### 3.5 Tabla admin envíos (`/admin/shipments`) — `admin-envios/Tabla*` + `Empty*` + `Error*`

- **Ya existe** `page.tsx`, `columns.tsx`, `filtersConfig.ts`, `ShipmentsTable.tsx`. **Trabajo**: integrar los estados del mockup.
- **Componer** sobre la página actual:
  - Header de página: título "Envíos" + botón `RefreshCw` "Refrescar".
  - **4× `<KpiCard>` arriba** (Activos / Entregados hoy / Fallidos / Devueltos) con sparkline mini (5-7 puntos hardcodeados en sprint 1 o derivados de `useShipmentsKpis()`). Las KPIs se cargan independiente de la tabla → siguen visibles en estados loading/empty/error.
  - Filtros bar existente — agregar chips activos clickeables con `×` (ya implícito en `FiltersBarServer`) y botón "Exportar" (sprint 1 placeholder).
  - Estados del body (renderizado dentro de `<DataTable>` o como overlay):
    - **Loading skeleton** → ya cubierto por `<TableSkeleton>` (cubre `Tabla _ loading skeleton.png`).
    - **Empty global** (`data.length===0 && noFilters`) → `<EmptyState icon={PackageOpen} title="Aún no hay envíos en el sistema" subtitle="Los envíos aparecen automáticamente cuando un comprador confirma el pago en Buyer App." />` (cubre `Empty _ sin data.png`, **sin CTA** — admin no crea).
    - **Empty con filtros** (`data.length===0 && hasFilters`) → `<EmptyState icon={SearchX} title="No hay envíos que coincidan" cta1={Limpiar filtros} cta2={Ver últimos 30 días} />` (cubre `Empty _ con filtros.png`).
    - **Error de red** (`isError`) → `<ErrorBanner title="Error cargando envíos" subtitle="Reintentá, si persiste avisá a ops@bicimarket.com" onRetry={refetch}/>` arriba; debajo header de tabla con skeleton inerte (cubre `Error _ fallo de red.png`).
  - Acciones row (`<ShipmentRowActions>` ya stub): kebab `MoreVertical` con "Ver detalle", "Copiar tracking", "Reasignar operador" (abre `<AssignOperatorDialog>`).
- **Datos**: `useShipmentsAdmin(...)` ya hecho; sumar `useShipmentsKpis()`.

### 3.6 Detalle admin envío (`/admin/shipments/[id]`) — `Detalle de env_o.png` + `modal reasignar.png`

- **Ruta**: `src/app/(admin)/admin/shipments/[id]/page.tsx` (crear).
- **Server Component**: valida admin via `isAdmin(sessionClaims)`. Pre-fetcha shipment con prisma (o deja que el client component lo haga).
- **Client Component** `<ShipmentAdminDetail shipmentId>`:
  - Breadcrumb `Admin / Envíos / shp_a1b2…`.
  - Header: `ChevronLeft` (volver), `tracking_number` mono grande + `<StatusBadge>`, botones derecha: `Etiqueta` (link `label_url`), `Ver en Buyer App` (link externo o disabled sprint 1), `Override status` rojo → abre `<OverrideStatusDialog>`.
  - **Layout 2 columnas** (`grid grid-cols-3 gap-6`, izquierda `col-span-2`):
  - **Col izquierda**:
    - Card RESUMEN: tabla `dl/dt` con `order_id`, `sales_order_id`, `buyer_profile_id`, `seller_profile_id`, `carrier`, `service_level`, `weight_grams_total`, `cost_cents` formateado, `shipped_at`. Cada ID es copiable (`onClick` → clipboard + `toast.success("Copiado")`).
    - Card DIRECCIONES: dos `<AddressCard>` (pickup / shipping) lado a lado + link "Ver ruta" (placeholder).
    - Card PAQUETES: lista de `packages` con descripción + `LxWxH cm · peso g`.
    - Card TRACKING EVENTS: `<TrackingTimeline events>` con badges de fuente (`carrier`/`logistics`/`system`).
    - Card AUDIT HISTORY: `<AuditHistoryTable history>` con `from → to · source · time · payload (expandible)`. Datos de `useShipmentStatusHistory(id)`.
  - **Col derecha**:
    - Card ASIGNACIÓN: avatar + nombre del operador + status + vehículo + patente + `op_id`. Botones "Reasignar operador" (abre `<AssignOperatorDialog mode="reassign">`) + "Contactar" (mailto o disabled).
    - Card ACCIONES ADMIN: lista de botones: Override status / Descargar etiqueta / Ver en Buyer App / Copiar IDs.
    - Card pálida "Sin reclamos del comprador" (placeholder visual — sprint 1 hardcoded).
- **`<AssignOperatorDialog>`** (cubre `Detalle _ modal reasignar.png`):
  - `Dialog` con header `× tracking`.
  - Si `mode='reassign'` → banner naranja "El operador actual {nombre} será reemplazado…".
  - `<Input>` search por nombre/email/ID. Filtra `useLogisticsOperators({ status:'active' })` en cliente.
  - Lista scrollable: avatar + nombre + vehículo + "X envíos activos" (de la prop `activeAssignmentsCount` que sumamos al DTO de operadores). Item seleccionado: fondo verde pálido + `Check` derecho.
  - Footer: Cancelar + "Asignar a {nombre}" disabled hasta seleccionar. Llama `assignOperator.mutate({shipment_id, operator_clerk_user_id})` (PATCH si reassign, POST si nuevo).
- **Datos**: `useShipment(id)`, `useTrackingEvents(id)`, `useShipmentStatusHistory(id)`, `useLogisticsOperators({status:'active'})`, `useShipmentAdminMutations(id)`.

### 3.7 Tabla admin operadores (`/admin/operators`) — `Tabla de operadores.png`

- **Ruta**: `src/app/(admin)/admin/operators/page.tsx` + `OperatorsTable.tsx` + `columns.tsx` + `filtersConfig.ts` (crear, espejo de la tabla de shipments).
- **Page header**: "Operadores · {total} operadores registrados · {active} activos" + CTA primary `+ Nuevo operador` → `/admin/operators/new`.
- **4× `<KpiCard>`**: Activos / Suspendidos / Assignments activos / Avg entregas/30d. Vía `useOperatorsKpis()`.
- **Filtros**: input search nombre/email, multi-select `status` (active/inactive/suspended), multi-select `vehicle_type` (motorcycle/car/van/truck).
- **Columnas**: avatar+nombre / vehículo+icono / patente mono / `<StatusBadge>` / activos (número) / entregas/30d (con chip rojo "N fallidas" si N>0) / alta (fecha) / kebab acciones (Ver detalle, Editar, Suspender).
- **Server-side** siguiendo `docs/09`: route `GET /api/v1/logistics-operators?...` (ya existe — extender con filtros y sort) + hook `useLogisticsOperatorsAdmin(...)` similar a `useShipmentsAdmin`.

### 3.8 Form alta operador (`/admin/operators/new`) — `Form _ Nuevo operador.png` + `Form _ con errores`

- **Ruta**: `src/app/(admin)/admin/operators/new/page.tsx` (crear).
- **Client Component** `<NewOperatorForm>`:
  - Breadcrumb `Admin / Operadores / Nuevo`.
  - Subtítulo: "Antes de crear acá, invitá al operador desde el Clerk Dashboard y copiá su `user_…` ID".
  - `react-hook-form` + `zodResolver(operatorSchema)` reusando `src/validation/logistics-operators.ts`.
  - Campos en orden: `clerk_user_id` (mono, helper "Lo copiás del Clerk Dashboard…"), `full_name`, `email` (con icono `Mail` + helper "Para notificaciones internas"), `phone` (placeholder `+54 9 11 3333 4444`), `document_id` (helper "Solo números, sin puntos"), `vehicle_type` (RadioGroup con 4 tiles con iconos `Bike`/`Car`/`Truck`/`Truck`; tile seleccionado tiene `border-primary bg-primary/5`), `license_plate` (auto-uppercase, sin espacios).
  - Errores **inline** debajo de cada campo (cubre `Form _ con errores`). El error de `clerk_user_id` ("No coincide con ningún usuario invitado en Clerk") proviene del backend (422 `CLERK_USER_NOT_FOUND` que devuelve `POST /logistics-operators` cuando no encuentra ese user en Clerk; sprint 1 puede dejarlo como simple unique constraint en DB).
  - Footer: Cancelar / "Crear operador" (`disabled={isPending}`).
  - Submit → `useLogisticsOperatorMutations().create.mutate(values, { onSuccess: (op) => router.push(`/admin/operators/${op.id}`) })`.

### 3.9 Detalle operador (`/admin/operators/[id]`) — `Detalle de operador.png`

- **Ruta**: `src/app/(admin)/admin/operators/[id]/page.tsx` (crear).
- **Layout 2 columnas**:
  - Header: avatar grande + nombre + `<StatusBadge>` + subtítulo "Van · AB123CD · Alta el 1 de mayo de 2026" + botones "Editar" / "Suspender" (destructive).
  - **Col izquierda**:
    - Card INFORMACIÓN (grid 3×2): email, teléfono, DNI, vehículo, patente, estado.
    - Card PERFORMANCE ÚLTIMOS 30 DÍAS + link "Ver completo": stats `{delivered} Entregados · {failed} Fallidas · {success_rate}% Tasa de éxito` + bar chart con `chart.tsx` de shadcn (recharts under the hood). Data de `useOperatorPerformance(id)`.
    - Card ASSIGNMENTS ACTIVOS: mini tabla `tracking · status · destino · peso` + flecha link a `/admin/shipments/[id]`. Data de `useOperatorActiveAssignments(id)`.
  - **Col derecha**:
    - Card ACCESO: clerk_user_id (mono truncado, copiable), operador id, último login (sprint 1 hardcoded `null` o "hace X" si llega del Clerk session).
    - Card ACCIONES: "Editar datos" (sprint 1 noop o link a form de edit), "Forzar logout" (sprint 1 disabled), "Suspender operador" (destructive — abre AlertDialog confirmación → `update.mutate({status:'suspended'})`).
    - Card NOTA (gris): "Suspender vs. inactivar — Al suspender bloqueás el acceso pero conservás el historial. Inactivar es para bajas definitivas."
- **Datos**: `useLogisticsOperator(id)`, `useOperatorPerformance(id)`, `useOperatorActiveAssignments(id)`, `useLogisticsOperatorMutations(id)`.

### 3.10–3.12 Páginas de error — `403/404/500.png`

- **404** — `src/app/not-found.tsx` (ya existe, reescribir): icono `SearchX` gris en cuadrado gris, eyebrow gris `ERROR 404`, título "No encontramos lo que buscás", subtítulo neutro, CTA verde "Ir al inicio" → `/`. Usar `<ErrorPageLayout>`.
- **403** — crear ruta `src/app/forbidden/page.tsx` (o reutilizar `error.tsx` con condición). Icono `Lock` rojo en cuadrado rosa, eyebrow rojo `ERROR 403`, título "No tenés permisos para ver esta página", CTA "Ir al dashboard" → `/dashboard`.
- **500** — `src/app/error.tsx` (ya existe, reescribir como error boundary global de Next): icono `OctagonAlert` rojo en rosa, eyebrow rojo `ERROR 500`, título "Algo salió mal", subtítulo "Reintentá en unos segundos…", botón "Reintentar" → `reset()`, link "Contactar soporte" → mailto, bloque mono "ERROR ID `{digest} · {timestamp}`" copiable. `error.tsx` recibe `{ error: Error & { digest?: string }, reset: () => void }`.

Todas centradas, max-width 480px, sin sidebar, funcionando en light/dark.

---

## 4. Patrones obligatorios a respetar (recordatorio)

- **Frontend nunca llama a Prisma ni a axios directo**: siempre vía hook + service + route handler (`docs/07`/`08`).
- **Toasts**: el helper `useApiMutation` ya los maneja. No agregar toasts manuales salvo casos especiales (copiar al portapapeles).
- **Tablas server-side**: URL como fuente de verdad via `useUrlParams`; `<DataTable>` + `<ServerSortButton>` + `<FiltersBarServer>` ya existen — reutilizar.
- **Validación**: zod en cada route handler. Esquemas en `src/validation/`.
- **IDs**: helper `generateId("shp"|"qte"|"pkg"|"evt"|"dla"|"prf"|"lop"|"rat"|"ssh")` de `@/lib/ids`. Nunca `cuid()` crudo.
- **Errores**: `new ApiError(code, status, msg, details)` + `handleApiError(err)` al final del catch.
- **Outbound diferido**: `logger.info({ level:"outbound-deferred", target, method, path, payload })`. No `callServiceApi`.
- **`params`/`searchParams` son `Promise`** en Next 16 — siempre `await`.
- **Dark mode**: usar tokens shadcn (`bg-background`, `text-foreground`, `bg-primary`, etc.). Nunca colores hardcodeados. Cada pantalla debe verse bien en ambos modos.
- **Tap targets mobile 44px**, contraste AA, badges con texto + color (no sólo color).

---

## 5. Orden de implementación (fases)

**Decidido**: arrancamos por **Fase 0** y avanzamos secuencial 0 → 1 → 2 → 3 → 4.

Cada fase entrega algo demostrable y desbloquea la siguiente.

**Fase 0 — Infra compartida** *(bloquea todo lo demás)*
1. `lib/status-styles.ts` + `<StatusBadge>`.
2. Layouts: `(admin)/layout.tsx` con sidebar real, `dashboard/layout.tsx` mobile-first.
3. Componentes feedback: `<EmptyState>`, `<ErrorBanner>`, `<ErrorPageLayout>`, `<KpiCard>`, `<AddressCard>`, `<TrackingTimeline>`, `<OperatorAvatar>`, `<VehicleIcon>`.
4. Hooks/routes faltantes (§2.4): `useLogisticsOperator`, `useShipmentStatusHistory`, KPIs hooks, `useOperatorPerformance`, `useOperatorActiveAssignments`, `useShipmentAdminMutations`.

**Fase 1 — Páginas de error y landing** *(prueba que la infra de feedback funciona)*
5. `/` landing (reescribir `app/page.tsx`).
6. `not-found.tsx` 404.
7. `error.tsx` 500.
8. `forbidden/page.tsx` 403.

**Fase 2 — Operador (PWA mobile)** *(camino crítico del negocio)*
9. `/dashboard/assignments` — lista con sus 5 estados.
10. `/dashboard/shipments/[id]` — detalle + `<PickupConfirmSheet>` + `<DeliveryConfirmSheet>` + `<TransitionButton>`.
11. `/dashboard` simple redirect.

**Fase 3 — Admin shipments**
12. `/admin/shipments` — completar la página existente con KPIs + estados loading/empty/error.
13. `/admin/shipments/[id]` — detalle con `<AssignOperatorDialog>` + `<OverrideStatusDialog>` + `<AuditHistoryTable>`.

**Fase 4 — Admin operadores**
14. `/admin/operators` — tabla server-side (espejo de shipments).
15. `/admin/operators/new` — form alta con validación.
16. `/admin/operators/[id]` — detalle con performance + acciones.

Fases 1-4 son **paralelizables** entre devs distintos siempre que la Fase 0 esté cerrada.

---

## 6. Archivos críticos (mapa de creación/modificación)

**Crear nuevos**:
- `src/lib/status-styles.ts`
- `src/components/status/StatusBadge.tsx`
- `src/components/feedback/{EmptyState,ErrorBanner,ErrorPageLayout}.tsx`
- `src/components/admin/{KpiCard,AssignOperatorDialog,OverrideStatusDialog,AuditHistoryTable}.tsx`
- `src/components/shipping/{AddressCard,TrackingTimeline}.tsx`
- `src/components/operator/{ShipmentMobileCard,OperatorAvatar,VehicleIcon,PickupConfirmSheet,DeliveryConfirmSheet,TransitionButton}.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/assignments/page.tsx`
- `src/app/dashboard/shipments/[id]/page.tsx`
- `src/app/(admin)/admin/shipments/[id]/page.tsx`
- `src/app/(admin)/admin/operators/{page.tsx,OperatorsTable.tsx,columns.tsx,filtersConfig.ts}`
- `src/app/(admin)/admin/operators/new/page.tsx`
- `src/app/(admin)/admin/operators/[id]/page.tsx`
- `src/app/forbidden/page.tsx`
- `src/app/api/v1/shipments/kpis/route.ts`
- `src/app/api/v1/shipments/[shipmentId]/status-history/route.ts`
- `src/app/api/v1/logistics-operators/[operatorId]/route.ts`
- `src/app/api/v1/logistics-operators/[operatorId]/performance/route.ts`
- `src/app/api/v1/logistics-operators/[operatorId]/active-assignments/route.ts`
- `src/app/api/v1/logistics-operators/kpis/route.ts`
- `src/hooks/querys/shipments/{useShipmentStatusHistory,useShipmentsKpis,useShipmentAdminMutations}.ts`
- `src/hooks/querys/logistics-operators/{useLogisticsOperator,useOperatorsKpis,useOperatorPerformance,useOperatorActiveAssignments,useLogisticsOperatorsAdmin}.ts`
- `src/services/api/logistics-operators.ts` (extender).

**Reescribir existentes**:
- `src/app/page.tsx` (landing real).
- `src/app/dashboard/page.tsx` (simplificar a redirect).
- `src/app/(admin)/layout.tsx` (sidebar real).
- `src/app/not-found.tsx` y `src/app/error.tsx` (usar `<ErrorPageLayout>`).
- `src/app/(admin)/admin/shipments/{page.tsx, ShipmentsTable.tsx}` (integrar KPIs + estados).

**Sin cambios**: `lib/{auth,prisma,axios,api-error,ids,transitions,logger,mocks,service-auth,pagination}.ts`, `components/data-table/*`, `components/ui/*`, hooks/services/types existentes (sólo se les suma).

---

## 7. Verificación

Para cada pantalla implementada:

1. **Visual**: compará lado a lado con el PNG de referencia. Idealmente correr `npm run dev` y abrir cada ruta. Verificá ambos modos (light/dark).
2. **Estados**: forzá cada uno modificando temporariamente el hook (devolver `data:[]`, `isLoading:true`, `isError:true`) o usando devtools de React Query para invalidar.
3. **Mobile (operador)**: usá Chrome DevTools en modo iPhone 13 (390×844). Verificá tap targets, scroll vertical, headers sticky.
4. **Desktop (admin)**: probá en 1440×900. Verificá responsive a 1024px (sidebar colapsa) y a 768px (sidebar como Sheet).
5. **Mutations**: cada acción operador (pickup, in_transit, out_for_delivery, deliver) debe emitir el log `outbound-deferred` correspondiente (mirar consola server) y avanzar el `status` correctamente. Transiciones inválidas deben mostrar el toast del 409 `INVALID_TRANSITION`.
6. **Auth**: deslogueado → landing. Logueado no-operador → 403 si entra a `/dashboard/*`. Operador sin admin → 403 si entra a `/admin/*`.
7. **DB**: verificá que tras un delivery quede registro en `tracking_events`, `delivery_proofs` y `shipment_status_history` con `prisma studio`.
8. **Type-check + lint**: `npm run build` debe pasar sin errores TS, `npm run lint` sin warnings nuevos.

**No hay tests automatizados en sprint 1** — testing manual riguroso siguiendo los 8 puntos de arriba por pantalla.

---

## 8. Decisiones abiertas (preguntar antes de implementar)

- **Sparklines en KpiCards**: ¿hardcodear 7 puntos random en sprint 1 o requerir endpoint real `?include=sparkline`? Sugerencia: hardcoded random, una línea para reemplazar luego.
- **"Ver completo" de performance del operador**: ¿lleva a una sub-ruta `/admin/operators/[id]/performance` o expande inline? Sugerencia: inline en sprint 1, ruta dedicada en sprint 2.
- **`<MapPlaceholder>` en detalle de envío operador**: ¿integramos Google Maps / Mapbox sprint 1 o dejamos un SVG estilizado fijo con la distancia mocked? Sugerencia: SVG estilizado + `≈ X km` calculado por Haversine sobre los postal_code snapshots (precisión baja pero suficiente).
- **Foto del delivery**: ¿base64 inline en columna (lo más simple, lo dice `docs/03 §SH4`) o introducir Supabase Storage ya? Sugerencia: base64 sprint 1 como dice la doc.
- **Pull-to-refresh real en mobile**: ¿implementar o dejar sólo botón `RefreshCw`? Sugerencia: botón en sprint 1, gesture en sprint 2.
- **"Editar operador"**: ¿se entrega en este bloque o se difiere? Sugerencia: PATCH ya está en el ticket si el form de `new` se puede reusar — si suma poco tiempo, hacerlo.
