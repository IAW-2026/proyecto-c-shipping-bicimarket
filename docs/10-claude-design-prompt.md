# Prompt para Claude Design — Shipping App (BiciMarket)

> Copiá este documento **entero** en Claude Design como prompt inicial. Contiene todo el contexto necesario para que entregue mockups consistentes de las ~15 pantallas del producto sin tener que volver a explicar nada. Iterá después por pantalla si querés refinar detalles.

---

## 1. Brief

Sos el equipo de diseño visual de **Shipping App**, una de las 4 webapps que componen **BiciMarket** — un marketplace argentino de bicicletas y repuestos. Estás diseñando dos superficies dentro de la misma app:

1. **App del operador logístico** — mobile-first, la usa en la calle un repartidor que retira paquetes en bicicleterías/casas particulares y los entrega al comprador final.
2. **Admin del marketplace** — desktop-first, la usan los responsables de operaciones para ver todos los envíos, dar de alta operadores y resolver casos.

Las dos superficies viven en el mismo deploy (`shipping.bicimarket.com`) bajo el mismo Clerk y la misma DB.

**Tono**: profesional, cálido, argentino. Esta es una app interna de un marketplace en crecimiento — no es ni una app corporativa rígida ni un producto consumer súper jovial. Funcional sobre decorativo.

---

## 2. Personas

### Operador logístico (uso principal)

- Repartidor 25-50 años, varón en su mayoría, con su propia moto/auto/van.
- **Usa el celular como herramienta principal de trabajo**. Pantalla siempre encendida durante la jornada.
- Condiciones reales: sol directo (necesita contraste alto), guantes a veces, lluvia, viento, casco.
- No es power-user de software: prefiere botones grandes con texto claro a iconos crípticos.
- Necesita ver de un vistazo: ¿qué tengo que hacer ahora? ¿adónde voy? ¿quién recibe?
- Su pregunta más frecuente: "¿este envío ya lo confirmé como entregado?"

### Admin del marketplace

- Operaciones / soporte interno, 25-45 años.
- **Usa desktop** (laptop) — pantalla grande, mouse, teclado.
- Power user funcional: filtros, búsquedas, ordenamiento, copy/paste de IDs.
- Necesita ver el bosque (cuántos envíos en cada estado) **y** el árbol (un caso específico que el comprador reclamó).
- Su pregunta más frecuente: "¿dónde está el envío `shp_abc123`?" y "¿quién es el operador que lo tiene?"

---

## 3. Sistema visual

### 3.1 Paleta de marca

**BiciMarket ya tiene paleta definida en `src/app/globals.css`** — es **verde-teal (OKLCH hue 168)** con dark mode completo. La identidad evoca sustentabilidad + modernidad (verde por bicicletas/eco, teal por tech). **No la cambies**. Usá los CSS vars de shadcn (`bg-primary`, `text-foreground`, etc.), nunca HEX hardcodeados, así el theme switch funciona automáticamente.

**Tokens disponibles** (referencia HEX aproximada solo para entender el feel):

**Light mode**
| Token Tailwind | OKLCH (real) | HEX aprox. | Uso |
|---|---|---|---|
| `bg-background` | `oklch(0.985 0.002 160)` | `#FAFAF9` | Fondo de página |
| `text-foreground` | `oklch(0.15 0.01 160)` | `#1F2421` | Texto principal (casi negro con tinte verde) |
| `bg-card` | `oklch(1 0 0)` | `#FFFFFF` | Tarjetas, modales |
| `bg-primary` / `text-primary` | `oklch(0.50 0.155 168)` | `#0E8275` | **Verde-teal de marca** — CTA principal, links activos, badges importantes |
| `text-primary-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Texto sobre primary |
| `bg-secondary` | `oklch(0.94 0.02 168)` | `#EAF1EF` | Fondos suaves, badges secundarios |
| `text-secondary-foreground` | `oklch(0.30 0.05 168)` | `#2E4D45` | Texto sobre secondary |
| `bg-muted` | `oklch(0.95 0.01 168)` | `#EFF3F1` | Fondos sutiles, hover de filas |
| `text-muted-foreground` | `oklch(0.50 0.02 168)` | `#6A7D75` | Labels, helper text, timestamps |
| `bg-accent` | `oklch(0.94 0.02 168)` | `#EAF1EF` | Hover/active states |
| `border-border` | `oklch(0.90 0.01 168)` | `#DDE5E2` | Bordes, divisores, inputs |
| `bg-destructive` | `oklch(0.577 0.245 27.325)` | `#DC4538` | Acciones destructivas, errores |
| `ring-ring` | `oklch(0.50 0.155 168)` | `#0E8275` | Focus ring (mismo que primary) |

**Sidebar** (admin shell — fondo OSCURO sobre página clara, tipo Linear/Vercel)
| Token | OKLCH | HEX aprox. |
|---|---|---|
| `bg-sidebar` | `oklch(0.22 0.05 168)` | `#1B3530` (verde muy oscuro casi negro) |
| `text-sidebar-foreground` | `oklch(0.95 0.01 168)` | `#EFF3F1` |
| `bg-sidebar-primary` | `oklch(0.55 0.155 168)` | `#13917F` (teal vibrante dentro del sidebar) |
| `bg-sidebar-accent` | `oklch(0.30 0.05 168)` | `#2E4D45` (hover de items del nav) |

**Charts** (`--chart-1` a `--chart-5`): variantes del mismo hue 168 con distintos lightness. Usalos para gráficos/sparklines manteniendo la familia visual.

### 3.2 Dark mode (soportado, prioritario)

El proyecto **YA tiene dark mode configurado** en `globals.css` con `.dark` class — habilitado por `next-themes` (ya en package.json). Cada pantalla DEBE funcionar en ambos modos sin esfuerzo extra: si usás los CSS vars de Tailwind/shadcn (`bg-background`, `text-foreground`, etc.) en lugar de colores hardcodeados, el switch es automático.

Dark mode (referencia visual):
- `bg-background` ≈ `#182522` (verde muy oscuro)
- `bg-card` ≈ `#213330`
- `text-foreground` ≈ `#EFF3F1`
- `bg-primary` ≈ `#29A38F` (teal aclarado para contraste sobre dark)

**Probá cada mockup en ambos modos** antes de declararlo done.

### 3.3 Estados de shipment (badges semánticos)

Estos colores **no están en `globals.css`** porque son semánticos del dominio shipping. Usá los tokens de Tailwind v4 (que entiende escalas como `bg-blue-500/15`) y mapealos como variantes de `<Badge>`. Mantener la familia visual con el teal de marca usando tonos paralelos:

| Estado | Variant | Tailwind classes | Lectura |
|---|---|---|---|
| `created`, `ready_for_pickup` | outline | `border-border text-muted-foreground` | Esperando acción |
| `picked_up` | info | `bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300` | Operador lo tiene |
| `in_transit` | info-strong | `bg-blue-600/15 text-blue-700 border-blue-600/30 dark:text-blue-300` | Yendo a destino |
| `out_for_delivery` | warning | `bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300` | Última milla, atender |
| `delivered` | success | `bg-emerald-600/15 text-emerald-700 border-emerald-600/30 dark:text-emerald-300` | Éxito terminal |
| `failed_delivery` | warning-strong | `bg-orange-600/15 text-orange-700 border-orange-600/30 dark:text-orange-300` | Atención, reintentar |
| `returned` | destructive | `bg-destructive/15 text-destructive border-destructive/30` | Negativo terminal |

**Estado de operador** (`LogisticsOperator.status`):

| Estado | Classes |
|---|---|
| `active` | `bg-primary/15 text-primary border-primary/30` (verde-teal de marca) |
| `inactive` | `bg-muted text-muted-foreground` |
| `suspended` | `bg-destructive/15 text-destructive border-destructive/30` |

### 3.4 Tipografía (ya seteada en el layout)

| Rol | Familia | CSS var | Cuándo |
|---|---|---|---|
| Headings | **Instrument Sans** | `--font-heading` | H1, H2, títulos de sección |
| Body / UI | **IBM Plex Sans** | `--font-sans` | Default. Pesos disponibles: 300, 400, 500, 600, 700 |
| Mono | **JetBrains Mono** | `--font-geist-mono` | Tracking numbers, IDs (`shp_…`, `lop_…`), códigos |

Escala:
- H1: 32px / 700
- H2: 24px / 600
- H3: 18px / 600
- Body: 14px / 400 (default UI), 16px en mobile para mejor legibilidad
- Small / labels: 12px / 500 uppercase tracking-wide

### 3.5 Espaciado e iconografía

- Sistema base 4px (Tailwind default). Padding de cards: 16px (mobile) / 24px (desktop).
- **Iconografía**: **Lucide React** exclusivamente (ya instalada). Tamaño default 16px en UI densa, 20-24px en mobile para tap targets.
- Border radius: 8px (`rounded-lg`) para cards, 6px (`rounded-md`) para inputs/buttons, 9999px (`rounded-full`) para badges.

### 3.6 Principios de UI

- **Mobile-first SIEMPRE** para todo lo del operador. Tap target mínimo 44×44px. Texto mínimo 14px (16px preferible).
- **Sin scroll horizontal nunca** en mobile.
- **Acción principal por pantalla**: una sola, primaria, full-width en mobile, destacada en desktop.
- **Estado visible de un vistazo**: el badge de status nunca puede estar oculto debajo del fold.
- **Confirmaciones explícitas** para acciones irreversibles (marcar entregado). Modal con resumen.
- **Toasts con sonner** para confirmaciones de éxito/error de mutations — ya está montado.
- **Idioma**: español argentino. "Vas a marcar este envío como entregado" mejor que "¿Confirma marcar el envío como entregado?".

---

## 4. Stack técnico que tenés que respetar

- **Next 16** + **React 19** + **TypeScript 5** + **Tailwind 4**
- **shadcn 4** (versión nueva). Componentes ya instalados disponibles: `accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `card`, `carousel`, `checkbox`, `combobox`, `command`, `dialog`, `drawer`, `dropdown-menu`, `input`, `input-otp`, `label`, `pagination`, `popover`, `radio-group`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner` (toasts), `switch`, `table`, `tabs`, `textarea`, `tooltip`. (~59 componentes en total — usá lo que ya hay, no inventes.)
- Base UI de shadcn es **`@base-ui/react`** (no Radix). El `Trigger` usa la prop `render={<Button .../>}` en vez de `asChild`. Ejemplo:
  ```tsx
  <PopoverTrigger render={<Button variant="outline" />}>Seleccionar</PopoverTrigger>
  ```
- **Tabla**: TanStack React Table v8 (manual pagination/sorting/filtering en server-side, estado en URL).
- **Forms**: react-hook-form + zod via `@hookform/resolvers/zod`.
- **Notificaciones**: `sonner` — `toast.success("...")`, `toast.error("...")`, `toast.loading("...")`.
- **NO usar**: emojis decorativos, ilustraciones SVG custom, animaciones complejas, gradientes pesados, glassmorphism.

---

## 5. Mapa de pantallas

```
/                                  Landing pública (mínima)
/sign-in/[[...sign-in]]            Clerk hosted (NO diseñar — usa default Clerk)
/sign-up/[[...sign-up]]            Clerk hosted (NO diseñar)

/dashboard                         Hub del operador logueado
/dashboard/assignments             Lista de mis envíos asignados (default landing post-login)
/dashboard/shipments/[id]          Detalle del envío + acciones del operador

/admin                             Redirect a /admin/shipments
/admin/shipments                   Tabla server-side de TODOS los envíos
/admin/shipments/[id]              Detalle admin con audit history
/admin/operators                   Tabla de operadores logísticos
/admin/operators/new               Form de alta de operador
/admin/operators/[id]              Detalle + edit de un operador
```

---

## 6. Data shapes (para usar en mockups con data realista)

Usá estos datos exactos (o variaciones) en las pantallas. Mejor data realista argentina que `Lorem ipsum`.

### ShipmentDTO

```ts
{
  id: "shp_a1b2c3d4e5f6789012345678",
  order_id: "ord_xyz789",
  order_seller_group_id: "osg_abc456",
  sales_order_id: "sor_def123",
  seller_profile_id: "slp_bicisur",
  buyer_profile_id: "byp_juanperez",
  carrier: "andreani",
  service_level: "standard",     // "standard" | "express" | "same_day"
  tracking_number: "TRK-AR-78451209",
  label_url: "/labels/sample.pdf",
  status: "in_transit",
  weight_grams_total: 14500,
  cost_cents: 1200000,            // ARS 12.000,00
  currency: "ARS",
  shipping_address_snapshot: {
    street: "Av. Corrientes",
    number: "1234",
    apartment: "5B",
    city: "CABA",
    province: "Buenos Aires",
    postal_code: "C1043",
    country: "AR"
  },
  pickup_address_snapshot: {
    street: "Av. Rivadavia",
    number: "9000",
    city: "Caballito",
    province: "Buenos Aires",
    postal_code: "C1406",
    country: "AR"
  },
  shipped_at: "2026-05-26T07:30:00Z",
  delivered_at: null,
  created_at: "2026-05-25T14:40:00Z"
}
```

### AssignmentDTO (lo que ve el operador en su lista)

```ts
{
  id: "shp_a1b2c3d4e5f6789012345678",
  tracking_number: "TRK-AR-78451209",
  status: "ready_for_pickup",
  pickup_address: { street: "Av. Rivadavia", number: "9000", city: "Caballito", province: "Buenos Aires", postal_code: "C1406", country: "AR" },
  shipping_address: { street: "Av. Corrientes", number: "1234", city: "CABA", province: "Buenos Aires", postal_code: "C1043", country: "AR" },
  weight_grams_total: 14500,
  packages_count: 1
}
```

### TrackingEventDTO (cada evento del timeline)

```ts
{
  id: "evt_xxx",
  event_type: "picked_up",        // "created" | "ready_for_pickup" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "failed_delivery" | "returned"
  location: "Caballito, CABA",
  note: "Retiro OK, vendedor entregó 1 bulto",
  occurred_at: "2026-05-26T07:30:00Z"
}
```

### LogisticsOperatorDTO

```ts
{
  id: "lop_op001",
  clerk_user_id: "user_2nKxYz...",
  full_name: "Juan Pérez",
  email: "juan.perez@logistica.bicimarket.com",
  phone: "+5491133334444",
  document_id: "30123456",
  vehicle_type: "van",            // "motorcycle" | "car" | "van" | "truck"
  license_plate: "AB123CD",
  status: "active",
  created_at: "2026-05-01T10:00:00Z"
}
```

**Datos argentinos para variar entre mockups**:
- Nombres: Juan Pérez, María González, Diego Fernández, Carolina Martínez, Federico López, Sofía Rodríguez, Matías Sosa
- Bicicleterías (sellers): "BiciSur", "Pedales del Plata", "La Rueda", "Ciclo Caballito", "Bici Centro"
- Productos: "Bicicleta Trek Marlin 5", "Cubierta Continental 29\"", "Casco Bell Stratus", "Cuadro Specialized Allez", "Cassette Shimano 11v"
- Barrios CABA: Caballito, Palermo, Belgrano, Recoleta, Almagro, Villa Crespo
- Tracking numbers formato `TRK-AR-XXXXXXXX` (8 dígitos)
- Cost en centavos (ej: `1200000` = ARS 12.000,00). En UI mostrar `$12.000,00`.

---

## 7. Pantallas a diseñar

### 7.1 Landing pública (`/`)

**Contexto**: alguien sin loguear entra a `shipping.bicimarket.com`. No es una página de marketing — es la entrada interna del marketplace.

**Incluir**:
- Logo de Shipping App (texto: "BiciMarket · Logística", con un icono Lucide tipo `Truck` o `Package` chico al lado).
- Una frase corta: "Plataforma de operaciones logísticas de BiciMarket"
- Botón primario "Iniciar sesión" → `/sign-in`
- Footer mínimo con copyright y link a `bicimarket.com` (marca paraguas).
- Sin hero gigante, sin features cards. Página de 1 fold, centrada.

**Responsive**: mobile y desktop, layout simétrico.

### 7.2 Dashboard del operador (`/dashboard`)

> Esta pantalla es el **landing post-login** del operador. Redirecciona o muestra contenido equivalente a `/dashboard/assignments`. Diseñalas juntas como una sola pantalla.

**Layout**:
- Top bar fija con:
  - Logo "BiciMarket · Logística" a la izquierda
  - `UserButton` de Clerk a la derecha (avatar + dropdown)
- Contenido principal: tabs o nav lateral con secciones. Para sprint 1 solo hay **"Mis envíos"** (default y única).
- **Mobile-first**: la top bar es 56px de alto, contenido full-width con padding 16px.

### 7.3 Lista "Mis envíos" (`/dashboard/assignments`)

**Contexto**: el operador entra, ve los envíos que tiene asignados y activos (`status` ∈ `[ready_for_pickup, picked_up, in_transit, out_for_delivery]`).

**Cada card de envío muestra**:
- **Badge de status** arriba (semántico — ver §3.1)
- **Tracking number** en mono, tamaño grande, copiable (long-press en mobile, click en desktop)
- **Dirección de retiro**: ícono `MapPin` + `Av. Rivadavia 9000, Caballito` (1 línea, truncada con ellipsis si es muy larga)
- **Dirección de entrega**: ícono `Home` + `Av. Corrientes 1234, CABA`
- **Peso**: `14,5 kg` con ícono `Package`
- **Bultos**: `1 bulto` o `3 bultos` con ícono `Boxes`
- **CTA principal según status**:
  - `ready_for_pickup` → botón primary "Ir a retirar"
  - `picked_up` → botón primary "Marcar en tránsito"
  - `in_transit` → botón primary "Marcar en reparto"
  - `out_for_delivery` → botón primary "Marcar entregado"
- Toda la card es tap target hacia `/dashboard/shipments/[id]` salvo el botón primario.

**Sin scroll horizontal**. Lista vertical infinita scrolleable.

**Estados a diseñar**:
- **Lista con 5+ envíos** (caso normal)
- **Lista con 1 envío** (operador nuevo)
- **Empty state**: "No tenés envíos asignados por ahora 👌" + ilustración minimalista o icono grande `PackageCheck` + texto "Volvé más tarde o pedile a tu coordinador que te asigne nuevos envíos."
- **Loading state**: 3-5 skeleton cards con `Skeleton` de shadcn

**Pull to refresh** en mobile (UX nice-to-have).

### 7.4 Detalle de envío del operador (`/dashboard/shipments/[id]`)

**Contexto**: el operador tocó una card. Acá ve toda la info + acciones disponibles según el `status`.

**Layout (mobile-first, scroll vertical)**:

1. **Header sticky** con:
   - Botón "Volver" (`ChevronLeft`) a la izquierda
   - Tracking number en mono, centrado
   - Badge de status a la derecha
2. **Sección Direcciones**:
   - Card "Retiro" con dirección completa, ícono `MapPin`, y CTA secundario "Abrir en Maps" (link a `https://maps.google.com/?q=...`)
   - Card "Entrega" con dirección completa, mismo formato, CTA "Abrir en Maps"
3. **Sección Detalles**:
   - Peso total: `14,5 kg`
   - Bultos: `1 bulto` (clickeable expand → detalle de cada paquete: dimensiones + descripción)
   - Servicio: `Estándar`
   - Comprador: `Juan Pérez` (snapshot, sin contacto directo — el operador no llama al cliente)
4. **Sección Acción principal** (la más importante, prominente, sticky en bottom):
   - Botón full-width según status (textos mismos que §7.3)
   - Para `out_for_delivery`: el botón abre el **Modal de delivery** (§7.5)
   - Para los anteriores: confirmación inline (`AlertDialog` de shadcn) tipo "¿Confirmás que retiraste el paquete?" → "Sí, marcar retirado" / "Cancelar"
5. **Sección Timeline** (al final, scrolleable):
   - Lista cronológica inversa de tracking events
   - Cada item: ícono + evento (`Picked up`, `In transit`, etc.) + location + note + hora ("Hace 2 horas" formato humanizable)

**Toasts**: tras cada acción exitosa, toast verde con "Marcado como retirado ✓" (sonner success).

### 7.5 Modal de delivery (dentro de `/dashboard/shipments/[id]`)

**Contexto**: el operador tocó "Marcar entregado". Necesita capturar prueba antes de cerrar el envío.

**Componente**: `Dialog` o `Sheet` (en mobile preferir Sheet bottom, en desktop Dialog centrado).

**Contenido**:
- Título: "Confirmar entrega"
- Subtítulo: tracking number en mono
- **Campo Foto** (obligatorio):
  - Botón grande "Tomar foto" con ícono `Camera` (en mobile abre la cámara del dispositivo via `<input type="file" accept="image/*" capture="environment">`)
  - Preview de la foto tomada con opción "Retomar"
  - Helper text: "Foto del paquete entregado o de la persona que recibió"
- **Campo Nota** (opcional):
  - `Textarea` con placeholder "Ej: Recibió Juan en portería"
- **Campo Firma** (opcional, sprint 2 — marcar como "Próximamente" o no incluir):
  - Skip por ahora
- **Botones**:
  - Primary: "Confirmar entrega" (disabled hasta que haya foto)
  - Secondary: "Cancelar"

**Tras éxito**: cierra modal, toast verde "Envío marcado como entregado ✓", redirige a `/dashboard/assignments` (que ya no incluye este envío porque pasó a estado terminal).

---

### 7.6 Admin shell / layout (`/admin/*`)

**Contexto**: el admin entra a cualquier `/admin/*`. Layout desktop-first.

**Layout**:
- **Sidebar** fijo a la izquierda (collapsible en pantallas medianas), 240px de ancho:
  - Logo "BiciMarket · Logística" arriba + chip "Admin" en small
  - Nav items:
    - `Truck` "Envíos" → `/admin/shipments`
    - `Users` "Operadores" → `/admin/operators`
  - Bottom: avatar + nombre del admin + logout
- **Top bar** corto (50px) con:
  - Breadcrumb (ej: `Admin / Envíos / shp_a1b2…`)
  - Search global a la derecha (no funcional sprint 1 — diseñar)
- **Content area** con max-width 1400px, padding 32px.

**Responsive**: en tablet (<1024px) el sidebar se vuelve `Sheet` que se abre desde la izquierda con un botón menu.

### 7.7 Tabla admin de shipments (`/admin/shipments`)

**Contexto**: el admin ve TODOS los envíos del marketplace con filtros y paginación server-side.

**Layout**:
- **Page header**: "Envíos" + subtitle "Todos los envíos del marketplace"
- **Stat cards** opcionales arriba (4 cards horizontales):
  - "Activos" (count de status ∈ ready/picked/transit/out)
  - "Entregados hoy"
  - "Fallidos" (failed_delivery)
  - "Devueltos" (returned)
- **Filtros bar** (FiltersBarServer — ya implementada):
  - Input "Tracking #" (debounced)
  - Multi-select "Estado" (popover con checkboxes, los 8 status enums)
  - Input "Seller ID"
  - Date range "Fecha de creación"
  - Botón "Limpiar" a la derecha
- **Tabla** con columnas:
  - Tracking # (mono, sorteable)
  - Estado (badge, sorteable)
  - Seller (id en mono)
  - Peso (`14,5 kg`)
  - Creado (fecha formato `25/05 14:40`, sorteable)
  - Acciones (kebab menu `MoreVertical` con: "Ver detalle", "Copiar tracking", "Reasignar operador")
- **Paginación** abajo: "1-20 de 134" + selector "Filas por página" + `<` `>` con número de página actual.

**Estados**:
- Tabla llena (20 filas)
- Empty con filtros aplicados: "No hay envíos que coincidan con los filtros aplicados" + botón "Limpiar filtros"
- Empty sin filtros: "Aún no hay envíos en el sistema" + ilustración minimalista
- Loading: skeleton rows manteniendo la altura de la tabla (no flash)
- Error: alert rojo arriba "Error cargando envíos" + botón "Reintentar"

### 7.8 Detalle admin de shipment (`/admin/shipments/[id]`)

**Contexto**: admin clickeó "Ver detalle". Tiene MÁS info que el operador (audit history completo, status_history con quién hizo qué).

**Layout** (2 columnas en desktop, 1 columna en tablet):

**Columna izquierda (2/3)**:
- Header: tracking number en mono grande + badge de status
- Card "Resumen":
  - Order ID, Sales Order ID, Buyer Profile ID (todos en mono, copiables, con tooltip "Click para copiar")
  - Seller, peso, costo
- Card "Direcciones": pickup + shipping (snapshots completos)
- Card "Paquetes": lista de los packages con dimensiones
- Card "Tracking events" con timeline igual al del operador pero con más metadata (quién lo registró, source)
- Card "Audit history" (ShipmentStatusHistory):
  - Tabla simple con: from_status → to_status, source (logistics/admin/system), occurred_at, payload (note expandible)

**Columna derecha (1/3)**:
- Card "Asignación":
  - Si hay assignment activo: avatar + nombre del operador + status del assignment + "Reasignar" button (abre modal §7.12)
  - Si no hay: "Sin asignar" + botón "Asignar operador" (abre modal §7.12)
- Card "Acciones admin":
  - "Override status" → abre dialog con select de status + nota
  - "Descargar etiqueta" (link al label_url)
  - "Ver en Buyer App" (link externo opcional)

### 7.9 Tabla de operadores (`/admin/operators`)

**Contexto**: lista de todos los logistics operators.

**Tabla** con columnas:
- Avatar (initials si no hay foto)
- Nombre completo
- Email
- Vehículo (badge con ícono según `vehicle_type`: `Bike` para motorcycle, `Car`, `Truck`)
- Patente (mono)
- Status (badge: active green / inactive gray / suspended red)
- Assignments activos (número, link al filtro de shipments por operador)
- Acciones (kebab: "Ver detalle", "Editar", "Suspender")

**Botón primary arriba a la derecha**: "+ Nuevo operador" → `/admin/operators/new`

**Filtros**: input search por nombre/email, multi-select status, multi-select vehicle_type.

### 7.10 Form de alta de operador (`/admin/operators/new`)

**Contexto**: admin crea un nuevo logistics operator. Antes de crear acá, el admin tuvo que invitar al operador en Clerk Dashboard y obtener su `clerk_user_id`.

**Form** con campos (en orden):
1. **Clerk User ID** (input, mono, ayuda: "Lo copiás del Clerk Dashboard después de invitar al operador. Empieza con `user_…`")
2. **Nombre completo** (input)
3. **Email** (input, type email)
4. **Teléfono** (input, placeholder `+54 9 11 3333 4444`)
5. **DNI / Documento** (input, solo números)
6. **Tipo de vehículo** (radio group con íconos):
   - Moto (`Bike`)
   - Auto (`Car`)
   - Van (`Truck` small)
   - Camión (`Truck` large)
7. **Patente** (input mono, uppercase auto, placeholder `AB123CD`)

**Footer**:
- "Cancelar" (vuelve a `/admin/operators`)
- "Crear operador" (primary)

**Validación**: zod schemas ya escritos en `src/validation/logistics-operators.ts`. Errores inline debajo de cada campo.

**Tras éxito**: toast verde, redirige a `/admin/operators/[id]` del recién creado.

### 7.11 Detalle de operador (`/admin/operators/[id]`)

**Contexto**: vista del operador con su info + assignments + opción de editar.

**Layout** (2 columnas):

**Izquierda**:
- Header: avatar + nombre + badge status
- Card "Información": email, teléfono, DNI, vehículo + patente, fecha de alta
- Card "Assignments activos" (últimos 10): tracking_number + status + dirección destino, link al detalle del shipment
- Card "Historial" (últimos 30 días): cuántos envíos completó, cuántos failed, gráfico simple barra o sparkline

**Derecha**:
- Card "Acciones": "Editar datos", "Suspender" (destructive), "Reactivar" si suspended
- Card "Acceso": "Clerk User ID" (mono, copiable), última vez logueado (si está disponible)

### 7.12 Modal de asignar operador

**Contexto**: desde el detalle de un shipment (§7.8), el admin clickeó "Asignar operador" o "Reasignar".

**Componente**: `Dialog` centrado.

**Contenido**:
- Título: "Asignar envío a operador"
- Subtítulo: tracking number en mono
- `Combobox` de shadcn con search:
  - Lista todos los operadores `active`
  - Muestra: nombre + vehículo + cantidad de assignments activos (`Juan Pérez · Van · 3 activos`)
  - Click selecciona
- Si es REASSIGN: extra alerta arriba "El operador actual (María González) será reemplazado. El cambio queda registrado en el audit."
- Botones: "Cancelar" / "Asignar" (primary, disabled hasta elegir).

---

## 8. Estados transversales

Para CADA pantalla con lista o detalle, asegurate de cubrir estos estados:

| Estado | Cuándo | Cómo se ve |
|---|---|---|
| **Loading inicial** | Primera carga, sin data en caché | Skeleton de filas/cards con shape correcto |
| **Loading con data anterior** | Refetch mientras hay data cacheada | Tabla/lista actual visible + indicador sutil arriba (spinner pequeño o barra de progreso) |
| **Empty (sin filtros)** | No hay data del todo | Ícono Lucide grande (zinc-400) + título + descripción + CTA si aplica |
| **Empty (con filtros)** | Hay data pero los filtros no matchean | Mensaje "No hay resultados con esos filtros" + botón "Limpiar filtros" |
| **Error de red** | Falló el fetch | `Alert` rojo con título + mensaje del error + botón "Reintentar" |
| **Error 403** | Sin permisos | Página dedicada con `Lock` ícono + "No tenés permisos para ver esto" + link "Volver" |
| **Error 404** | Recurso no existe | Página dedicada con `SearchX` + "No encontramos lo que buscás" + link "Volver al inicio" |
| **Saving / mutation in progress** | Submit de form, click de acción | Botón con spinner + texto "Procesando…" + el resto del form disabled |
| **Success** | Mutation completada | Toast verde sonner + UI refrescada |

---

## 9. Páginas de error

Diseñar (1 mockup por cada una):

- **404** (`not-found.tsx`) — `SearchX` ícono + "Esta página no existe" + link "Ir al inicio"
- **403** (`forbidden.tsx`) — `Lock` ícono + "No tenés permisos para ver esta página" + link "Ir al dashboard"
- **500** (`error.tsx`) — `AlertOctagon` + "Algo salió mal" + botón "Reintentar" (resetea el error boundary)

Todas centradas verticalmente en viewport, máximo 480px de ancho, copy en español argentino claro.

---

## 10. Responsive

| Breakpoint | Comportamiento |
|---|---|
| `< 640px` (mobile) | Layout vertical, tap targets 44px+, sidebar admin colapsado a `Sheet`, tabla admin se convierte en lista de cards |
| `640px – 1024px` (tablet) | Tabla admin con scroll horizontal si hace falta, sidebar como `Sheet` |
| `> 1024px` (desktop) | Layout completo de 2 columnas en detalles, sidebar fijo |

**El operador SIEMPRE en mobile**. Si abre la app en desktop, mostrar el mismo layout mobile centrado con max-width 480px (no aprovechar el espacio extra — preserva la familiaridad).

**El admin SIEMPRE en desktop preferentemente**. En mobile funciona pero degradado.

---

## 11. Accesibilidad

- Contraste AA mínimo (WCAG 2.1) en TODO. Especialmente importante para el operador outdoor (sol directo).
- `aria-label` en botones con solo ícono.
- Focus visible (ring naranja del primary) en todos los elementos interactivos.
- `<label>` asociado a cada input (no placeholder como label).
- Status badges nunca dependen SOLO del color — siempre acompañados de texto.
- Tap targets 44×44px mínimo (Apple HIG / Material).
- **Dark mode soportado de entrada**: usar SIEMPRE tokens shadcn (`bg-background`, `text-foreground`, etc.) y nunca colores hardcodeados (`bg-white`, `text-black`). Probá cada pantalla en ambos modos.

---

## 12. Qué entregar

Por cada pantalla del §7, entregá:

1. **JSX/TSX funcional** con clases Tailwind, importando componentes shadcn reales (ej: `import { Button } from "@/components/ui/button"`).
2. **Data mockeada inline** usando las shapes de §6.
3. **Todos los estados** del §8 que apliquen (mínimo loading + empty + success/normal).
4. **Responsive**: una sola versión que funcione bien en mobile y desktop si es admin, o solo mobile si es operador.
5. **Comentarios** marcando dónde irían los hooks reales (ej: `// TODO: reemplazar con useMyAssignments()`).

**Formato preferido**: un archivo `.tsx` por pantalla, con todas las variantes de estado como sub-componentes exportados (`<MyAssignmentsLoading />`, `<MyAssignmentsEmpty />`, `<MyAssignments />`).

**Bonus** (si tenés tiempo):
- Un archivo `lib/status-styles.ts` con un mapping `Record<ShipmentStatus, { variant, classes, label }>` para reusar entre la lista del operador, las cards y la tabla admin.
- Un Storybook-style sheet con todos los `<Badge>` de status (los 8 de shipment + los 3 de operador) uno al lado del otro EN AMBOS MODOS (light y dark) para validar la consistencia y el contraste.

---

## 13. Qué NO hacer

- **No diseñar las páginas de Clerk** (`/sign-in`, `/sign-up`) — usan default hosted UI.
- **No diseñar features de sprint 2**: portal B2B, suscripciones, ML/MercadoPago, layouts de comprador/vendedor. Esas son OTRAS apps del marketplace.
- **No inventar endpoints** ni cambiar los DTOs de §6 — son contractuales.
- **No usar emojis decorativos** ni ilustraciones custom súper detalladas — íconos Lucide alcanzan.
- **No usar bibliotecas de animación pesadas** (framer-motion, gsap) — las transiciones default de shadcn + Tailwind son suficientes.
- **No agregar dependencias nuevas** (Tailwind, shadcn, Lucide, sonner ya cubren todo).
- **No diseñar reportes / analytics complejos** — sprint 2.
- **No diseñar UI multi-idioma** — solo español argentino.
- **No hardcodear colores** (`bg-white`, `#FFFFFF`, `text-black`, etc.). Siempre tokens shadcn (`bg-background`, `text-foreground`, `bg-primary`, etc.) para que dark mode funcione.

---

## 14. Stack de referencia (para que importes bien)

```tsx
// Componentes shadcn
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Iconografía
import { MapPin, Home, Package, Boxes, Camera, ChevronLeft, ChevronRight,
         Truck, Users, Bike, Car, Lock, SearchX, AlertOctagon, PackageCheck,
         MoreVertical, ArrowUpDown, Check } from "lucide-react";

// Toasts
import { toast } from "sonner";
// Ejemplo: toast.success("Marcado como retirado", { description: "TRK-AR-78451209" })
```

---

## 15. Iteración

Esperá un **primer cut** de las 15 pantallas. Después iteramos así:

1. Revisar pantallas críticas primero (detalle de envío del operador + modal de delivery + tabla admin de shipments).
2. Ajustar paleta de status si algún color no funciona en contraste real (sol directo para el operador).
3. Refinar el flujo del modal de delivery con la cámara real una vez que tengamos device testing.
4. Validar dark mode en condiciones nocturnas reales del operador (más relevante de lo que parece — repartos a la noche pasan).

**Si tenés dudas de scope o convenciones**, asumí lo más conservador y dejá un comentario `// DESIGN-Q: …` en el JSX para que lo resolvamos después.

---

**Listo. Generá los 15 mockups siguiendo esta especificación.**
