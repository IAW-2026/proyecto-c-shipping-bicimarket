"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ServerSortButton } from "@/components/data-table/ServerSortButton";
import type { ShipmentDTO, ShipmentStatus } from "@/types/shipments";

// Mapeo de status → variant del Badge. Mantener alineado a la paleta de la
// marca cuando esté definida.
const STATUS_VARIANT: Record<ShipmentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  created: "outline",
  ready_for_pickup: "secondary",
  picked_up: "secondary",
  in_transit: "default",
  out_for_delivery: "default",
  delivered: "default",
  failed_delivery: "destructive",
  returned: "destructive",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const columnsShipments: ColumnDef<ShipmentDTO>[] = [
  {
    accessorKey: "tracking_number",
    header: () => (
      <ServerSortButton columnId="tracking_number" title="Tracking #" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.tracking_number}</span>
    ),
  },
  {
    accessorKey: "status",
    header: () => <ServerSortButton columnId="status" title="Estado" />,
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status]}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "seller_profile_id",
    header: "Seller",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.seller_profile_id}
      </span>
    ),
  },
  {
    accessorKey: "weight_grams_total",
    header: "Peso",
    cell: ({ row }) =>
      `${(row.original.weight_grams_total / 1000).toFixed(1)} kg`,
  },
  {
    accessorKey: "created_at",
    header: () => <ServerSortButton columnId="created_at" title="Creado" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
];
