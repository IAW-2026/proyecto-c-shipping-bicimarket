"use client";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiltersBarServer } from "./FiltersBarServer";
import { DataTablePagination } from "./DataTablePagination";
import { TableSkeleton } from "./TableSkeleton";
import type { FilterConfig } from "@/types/filters";
import type { PaginatedResponse } from "@/types/common";

interface DataTableProps<T> {
  data: T[];
  // biome-ignore lint/suspicious/noExplicitAny: ColumnDef necesita su propio type param
  columns: ColumnDef<T, any>[];
  filters: FilterConfig[];
  pagination: PaginatedResponse<T>["pagination"];
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * Tabla genérica server-side. Estado en URL (per docs/09).
 * El consumidor pasa data + columns + filters + pagination y este componente
 * se encarga del render + interacción con la URL para sort/filter/pagination.
 *
 * Usa manualPagination/Sorting/Filtering porque el server hace todo eso.
 */
export function DataTable<T>({
  data,
  columns,
  filters,
  pagination,
  isLoading,
  emptyMessage = "Sin resultados",
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.max(
      1,
      Math.ceil(pagination.total / pagination.limit),
    ),
  });

  return (
    <div className="space-y-3">
      <FiltersBarServer filters={filters} />

      <div className="rounded-md border">
        {isLoading && data.length === 0 ? (
          <div className="p-4">
            <TableSkeleton
              rows={pagination.limit}
              columns={columns.length}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <DataTablePagination total={pagination.total} />
    </div>
  );
}
