# 1.9 — Tablas server-side con TanStack React Table

> **Shipping App** · Stack: Next 16 + TanStack React Table v8 + TanStack Query 5 + shadcn `<Table>` + Prisma 6.
> Patrón para listados administrativos donde el volumen amerita paginación + filtros + sort en el server.

## Cuándo server-side vs client-side

| | **Server-side** (este doc) | **Client-side** |
|---|---|---|
| Datos | Paginados desde el backend | Todos los datos de una vez |
| Filtros | Query params en URL → API | `columnFilters` en memoria con `getFilteredRowModel()` |
| Sorting | `ServerSortButton` actualiza URL (`sort_by`, `sort_dir`) | `column.toggleSorting()` de TanStack |
| Paginación | `page` y `per_page` en URL | No hay (se muestran todas las filas filtradas) |
| Fuente de verdad del estado | **URL** (`searchParams`) | Estado React local |
| Ideal para | Listados grandes (admin: todos los shipments del marketplace) | Listados acotados (My assignments del operador — pocos activos) |

**En Shipping App, casos server-side típicos:**
- `/admin/shipments` — todos los envíos del marketplace, filtrables por status, seller, fechas.
- `/admin/logistics-operators` — lista de operadores con búsqueda y filtro por status/vehículo.
- `/admin/tracking-events` — auditoría global de eventos.

**Casos client-side típicos:**
- `/dashboard/assignments` — el operador tiene pocos shipments activos, alcanza con un solo fetch.

Este doc cubre **server-side**. Si después se suma un caso client-side, se documenta en una sección aparte.

---

## Estructura de archivos por tabla

Cada tabla server-side se compone de estos archivos colocados juntos:

```
src/app/(admin)/admin/shipments/
├── page.tsx              ← Server Component: valida searchParams, redirige defaults
├── columns.tsx           ← ColumnDef[] de TanStack
├── filtersConfig.ts      ← FilterConfig[] declarativa
└── ShipmentsTable.tsx    ← Client Component: hook + renderiza <DataTable>
```

El componente genérico `<DataTable>` vive en `src/components/data-table/` y se reutiliza entre todas las tablas server-side.

---

## Flujo completo

```
ShipmentsAdminPage (page.tsx, server)
  │  Valida searchParams; redirige si faltan defaults
  │  (page=1, per_page=20, sort_by=created_at, sort_dir=desc)
  ↓
ShipmentsTable (client component)
  │  useUrlParams() lee la URL
  │  Llama useShipmentsAdmin(filters, page, perPage, sortBy, sortDir)
  ↓
useShipmentsAdmin (hook)
  │  queryKey: ["shipments", "admin", filters, page, perPage, sortBy, sortDir]
  │  Service → GET /api/v1/shipments?status[]=...&page=...
  ↓
Route Handler (src/app/api/v1/shipments/route.ts)
  │  auth() + verifica admin
  │  Parsea querystring con zod
  │  prisma.shipment.findMany + count con where dinámico
  │  Devuelve { data, pagination }
  ↓
<DataTable> (genérico)
  │  useReactTable({ data, columns, manualPagination, manualSorting, manualFiltering })
  │  Renderiza: <FiltersBarServer /> + <Table /> shadcn + <DataTablePagination />
  ↓
  ├── FiltersBarServer    →  setMultipleParams() → URL → React Query refetch
  ├── ServerSortButton    →  setMultipleParams({sort_by, sort_dir}) → refetch
  └── DataTablePagination →  setMultipleParams({page, per_page}) → refetch
```

**Principio:** la URL (`searchParams`) es la **fuente de verdad** del estado de la tabla. Compartible por link, reload-safe, back/forward navigation funciona. El hook `useUrlParams` expone helpers para leer y hacer batch update.

---

## 1. Page — punto de entrada

**Archivo:** `src/app/(admin)/admin/shipments/page.tsx`

```tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ShipmentsTable } from "./ShipmentsTable";
import { TableSkeleton } from "@/components/data-table/TableSkeleton";

const DEFAULTS = {
  page: "1",
  per_page: "20",
  sort_by: "created_at",
  sort_dir: "desc",
};

export default async function ShipmentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;                       // ⚠️ Next 16: searchParams es Promise

  // Redirige a la URL con defaults si faltan params obligatorios
  const missing = Object.keys(DEFAULTS).some((k) => !sp[k]);
  if (missing) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...DEFAULTS, ...sp })) {
      if (typeof v === "string") params.set(k, v);
    }
    redirect(`/admin/shipments?${params.toString()}`);
  }

  return (
    <Suspense fallback={<TableSkeleton rows={15} />}>
      <ShipmentsTable />
    </Suspense>
  );
}
```

---

## 2. FilterConfig — `columnId` = nombre del query param

A diferencia del modo client-side, acá `columnId` es **el nombre del query param que entiende el route handler** (no el accessor de la columna).

**Archivo:** `src/app/(admin)/admin/shipments/filtersConfig.ts`

```ts
import type { FilterConfig } from "@/types/filters";

export const filterConfigsShipments: FilterConfig[] = [
  {
    columnId: "tracking_number",     // → ?tracking_number=TRK-AR-789
    isPrincipal: true,
    isCompact: true,
    type: "input",
    placeholder: "Tracking #",
  },
  {
    columnId: "status",              // → ?status[]=in_transit&status[]=delivered
    type: "multi-select",
    placeholder: "Estado",
    customOptions: [
      "created", "ready_for_pickup", "picked_up", "in_transit",
      "out_for_delivery", "delivered", "failed_delivery", "returned",
    ],
  },
  {
    columnId: "seller_profile_id",   // → ?seller_profile_id=slp_…
    type: "input",
    placeholder: "Seller ID",
  },
  {
    columnId: "created_at",          // → ?created_at_from=...&created_at_to=...
    type: "date-range",
    placeholder: "Fecha de creación",
  },
];
```

---

## 3. Columns — sin `filterFn`, sort con `<ServerSortButton>`

Las columnas **no** llevan `filterFn` (el backend filtra). El sorting usa un botón custom `<ServerSortButton>` que actualiza `sort_by` / `sort_dir` en la URL.

**Archivo:** `src/app/(admin)/admin/shipments/columns.tsx`

```tsx
"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ServerSortButton } from "@/components/data-table/ServerSortButton";
import { formatDate } from "@/lib/format";
import type { ShipmentDTO } from "@/types/shipments";

export const columnsShipments: ColumnDef<ShipmentDTO>[] = [
  {
    accessorKey: "tracking_number",
    header: () => <ServerSortButton columnId="tracking_number" title="Tracking #" />,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={statusVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "seller_profile_id",
    header: "Seller",
  },
  {
    accessorKey: "created_at",
    header: () => <ServerSortButton columnId="created_at" title="Creado" />,
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    id: "actions",
    cell: ({ row }) => <ShipmentRowActions shipment={row.original} />,
  },
];
```

---

## 4. Hook — `useShipmentsAdmin`

**Archivo:** `src/hooks/querys/shipments/useShipmentsAdmin.ts`

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { getShipmentsAdmin } from "@/services/api/shipments";
import type { ShipmentsAdminFilters } from "@/types/shipments";

export function useShipmentsAdmin(
  filters: ShipmentsAdminFilters,
  page: number,
  perPage: number,
  sortBy: string,
  sortDir: "asc" | "desc"
) {
  return useQuery({
    queryKey: ["shipments", "admin", filters, page, perPage, sortBy, sortDir],
    queryFn: () => getShipmentsAdmin(filters, page, perPage, sortBy, sortDir),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,  // ← mantiene la data vieja mientras refetchea
  });
}
```

`placeholderData: (prev) => prev` evita el "flash" de skeleton al cambiar de página/filtros — la tabla anterior queda visible hasta que llega la nueva (smooth UX, casi como SPA).

---

## 5. Service — querystring builder

**Archivo:** `src/services/api/shipments.ts` (extracto)

```ts
import { api } from "@/lib/axios";
import type { PaginatedResponse } from "@/types/assignments";
import type { ShipmentDTO, ShipmentsAdminFilters } from "@/types/shipments";

export async function getShipmentsAdmin(
  filters: ShipmentsAdminFilters,
  page: number,
  perPage: number,
  sortBy: string,
  sortDir: "asc" | "desc"
): Promise<PaginatedResponse<ShipmentDTO>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort_by: sortBy,
    sort_dir: sortDir,
  });

  if (filters.tracking_number) params.set("tracking_number", filters.tracking_number);
  if (filters.seller_profile_id) params.set("seller_profile_id", filters.seller_profile_id);

  // arrays con bracket notation
  if (filters.status?.length) {
    for (const s of filters.status) params.append("status[]", s);
  }

  if (filters.created_at_from) params.set("created_at_from", filters.created_at_from);
  if (filters.created_at_to) params.set("created_at_to", filters.created_at_to);

  const response = await api.get<PaginatedResponse<ShipmentDTO>>(
    `/v1/shipments?${params.toString()}`
  );
  return response.data;
}
```

---

## 6. Route Handler — Prisma con `where` dinámico

**Archivo:** `src/app/api/v1/shipments/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import type { Prisma } from "@/generated/prisma";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.enum(["created_at", "tracking_number", "status"]).default("created_at"),
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
  tracking_number: z.string().optional(),
  seller_profile_id: z.string().optional(),
  status: z.array(z.string()).optional(),
  created_at_from: z.string().datetime().optional(),
  created_at_to: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const isAdmin = (sessionClaims?.publicMetadata as any)?.admin === true;
    if (!userId || !isAdmin) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const { searchParams } = new URL(request.url);
    const raw = {
      page: searchParams.get("page"),
      per_page: searchParams.get("per_page"),
      sort_by: searchParams.get("sort_by"),
      sort_dir: searchParams.get("sort_dir"),
      tracking_number: searchParams.get("tracking_number") ?? undefined,
      seller_profile_id: searchParams.get("seller_profile_id") ?? undefined,
      status: searchParams.getAll("status[]"),
      created_at_from: searchParams.get("created_at_from") ?? undefined,
      created_at_to: searchParams.get("created_at_to") ?? undefined,
    };
    const filters = querySchema.parse(raw);

    const where: Prisma.ShipmentWhereInput = {
      ...(filters.tracking_number && {
        trackingNumber: { contains: filters.tracking_number, mode: "insensitive" },
      }),
      ...(filters.seller_profile_id && {
        sellerProfileId: filters.seller_profile_id,
      }),
      ...(filters.status?.length && { status: { in: filters.status as any } }),
      ...((filters.created_at_from || filters.created_at_to) && {
        createdAt: {
          ...(filters.created_at_from && { gte: new Date(filters.created_at_from) }),
          ...(filters.created_at_to && { lte: new Date(filters.created_at_to) }),
        },
      }),
    };

    const sortColumn: Record<string, string> = {
      created_at: "createdAt",
      tracking_number: "trackingNumber",
      status: "status",
    };

    const [data, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        orderBy: { [sortColumn[filters.sort_by]]: filters.sort_dir },
        skip: (filters.page - 1) * filters.per_page,
        take: filters.per_page,
      }),
      prisma.shipment.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        total,
        page: filters.page,
        limit: filters.per_page,
        has_more: filters.page * filters.per_page < total,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
```

---

## 7. Componente `<DataTable>` genérico (esqueleto)

**Archivo:** `src/components/data-table/DataTable.tsx`

```tsx
"use client";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FiltersBarServer } from "./FiltersBarServer";
import { DataTablePagination } from "./DataTablePagination";
import { TableSkeleton } from "./TableSkeleton";
import type { FilterConfig } from "@/types/filters";
import type { PaginatedResponse } from "@/types/assignments";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  filters: FilterConfig[];
  pagination: PaginatedResponse<T>["pagination"];
  isLoading?: boolean;
}

export function DataTable<T>({
  data, columns, filters, pagination, isLoading,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(pagination.total / pagination.limit),
  });

  return (
    <div className="space-y-4">
      <FiltersBarServer filters={filters} />
      {isLoading ? (
        <TableSkeleton rows={pagination.limit} />
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <DataTablePagination total={pagination.total} />
    </div>
  );
}
```

---

## 8. `useUrlParams` — fuente de verdad

**Archivo:** `src/hooks/useUrlParams.ts`

```ts
"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setMultipleParams(updates: Record<string, string | string[] | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      // limpia key anterior (importante para arrays)
      params.delete(key);
      params.delete(`${key}[]`);
      if (value === null) continue;
      if (Array.isArray(value)) {
        for (const v of value) params.append(`${key}[]`, v);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return {
    getParam: (key: string) => searchParams.get(key),
    getArrayParam: (key: string) => searchParams.getAll(`${key}[]`),
    setMultipleParams,
    clearAllParams: () => router.replace(pathname, { scroll: false }),
  };
}
```

---

## Tipo `FilterConfig`

**Archivo:** `src/types/filters.ts`

```ts
export type FilterType = "input" | "select" | "multi-select" | "date-range" | "range";

export interface FilterConfig {
  /** Server-side: nombre del query param de la API. Client-side: accessorKey de la columna. */
  columnId: string;
  type: FilterType;
  placeholder: string;
  /** true = se muestra inline siempre visible (fuera del popover "más filtros") */
  isPrincipal?: boolean;
  /** true = versión compacta del input */
  isCompact?: boolean;
  /** Opciones hardcodeadas para multi-select cuando no vienen de una API (status enums, etc.) */
  customOptions?: string[];
}
```

> **Sprint 1**: en Shipping no consumimos APIs de otras apps para poblar dropdowns. Las opciones de multi-select se hardcodean en `customOptions` (status enums, vehicle types). En sprint 2, si hace falta listar sellers u operadores en un dropdown, se suman hooks `useSellersList` / `useOperatorsList` y un resolver de opciones.

---

## Resumen — crear una tabla server-side nueva

1. **`page.tsx`** — Validar/setear defaults de `searchParams` (page, per_page, sort_by, sort_dir), redirigir si faltan, renderizar el client component de tabla. **`searchParams` es `Promise<...>` en Next 16** → siempre `await`.
2. **`filtersConfig.ts`** — `FilterConfig[]` donde `columnId` es el **nombre del query param que entiende el route handler**.
3. **`columns.tsx`** — `ColumnDef<DTO>[]` sin `filterFn`, sort con `<ServerSortButton>`.
4. **`{Recurso}Table.tsx`** — client component: lee URL params con `useUrlParams`, llama al hook, pasa la data al `<DataTable>` genérico.
5. **Hook** en `src/hooks/querys/{dominio}/use{Recurso}Admin.ts` — `useQuery` con queryKey que incluye filtros + page + sort, `placeholderData: prev => prev`.
6. **Service** en `src/services/api/{dominio}.ts` — construye querystring con `URLSearchParams` (bracket notation para arrays).
7. **Route Handler** en `src/app/api/v1/{recurso}/route.ts` — `auth()` + verifica admin + `zod` del querystring + Prisma `findMany` + `count` en `Promise.all` + devuelve `{ data, pagination }`.

**Regla de oro:** todo el estado de la tabla vive en la URL. Si refrescás el browser, todo se reconstruye igual.
