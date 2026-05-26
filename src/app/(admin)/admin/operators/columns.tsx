"use client";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";
import { ServerSortButton } from "@/components/data-table/ServerSortButton";
import { StatusBadge } from "@/components/status/StatusBadge";
import { OperatorAvatar } from "@/components/operator/OperatorAvatar";
import { VehicleIcon } from "@/components/operator/VehicleIcon";
import { VEHICLE_LABELS } from "@/lib/status-styles";
import { formatDateShort } from "@/lib/format";
import type { LogisticsOperatorAdminDTO } from "@/types/operator-performance";

export const columnsOperators: ColumnDef<LogisticsOperatorAdminDTO>[] = [
  {
    accessorKey: "full_name",
    header: () => <ServerSortButton columnId="full_name" title="Operador" />,
    cell: ({ row }) => (
      <Link
        href={`/admin/operators/${row.original.id}`}
        className="flex items-center gap-3 hover:text-foreground"
      >
        <OperatorAvatar
          name={row.original.full_name}
          status={row.original.status}
          size="sm"
        />
        <div className="leading-tight">
          <p className="text-sm font-medium">{row.original.full_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      </Link>
    ),
  },
  {
    accessorKey: "vehicle_type",
    header: "Vehículo",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <VehicleIcon vehicle={row.original.vehicle_type} />
        {VEHICLE_LABELS[row.original.vehicle_type]}
      </span>
    ),
  },
  {
    accessorKey: "license_plate",
    header: "Patente",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-foreground">
        {row.original.license_plate}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: () => <ServerSortButton columnId="status" title="Estado" />,
    cell: ({ row }) => (
      <StatusBadge kind="operator" status={row.original.status} size="sm" />
    ),
  },
  {
    accessorKey: "active_assignments_count",
    header: "Activos",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.status === "active"
          ? row.original.active_assignments_count
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "delivered_30d",
    header: "Entregas / 30D",
    cell: ({ row }) => {
      const failed = row.original.failed_30d;
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums">
            {row.original.delivered_30d}
          </span>
          {failed > 0 && (
            <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              {failed} fallidas
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: () => <ServerSortButton columnId="created_at" title="Alta" />,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDateShort(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Link
        href={`/admin/operators/${row.original.id}`}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Ver detalle"
      >
        <ArrowRight className="size-4" />
      </Link>
    ),
  },
];
