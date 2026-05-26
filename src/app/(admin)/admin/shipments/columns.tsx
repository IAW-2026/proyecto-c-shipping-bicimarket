"use client";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ServerSortButton } from "@/components/data-table/ServerSortButton";
import { StatusBadge } from "@/components/status/StatusBadge";
import { formatDateShort, formatWeightKg, truncateId } from "@/lib/format";
import type { ShipmentDTO } from "@/types/shipments";

export const columnsShipments: ColumnDef<ShipmentDTO>[] = [
  {
    accessorKey: "tracking_number",
    header: () => (
      <ServerSortButton columnId="tracking_number" title="Tracking #" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-foreground">
        {row.original.tracking_number}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: () => <ServerSortButton columnId="status" title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
  },
  {
    accessorKey: "shipping_address_snapshot",
    header: "Origen → Destino",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.pickup_address_snapshot.city} →{" "}
        {row.original.shipping_address_snapshot.city}
      </span>
    ),
  },
  {
    accessorKey: "seller_profile_id",
    header: "Seller",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {truncateId(row.original.seller_profile_id, 12, 4)}
      </span>
    ),
  },
  {
    accessorKey: "weight_grams_total",
    header: "Peso",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {formatWeightKg(row.original.weight_grams_total)}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: () => <ServerSortButton columnId="created_at" title="Creado" />,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDateShort(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <RowActions shipment={row.original} />,
  },
];

function RowActions({ shipment }: { shipment: ShipmentDTO }) {
  function copyTracking() {
    navigator.clipboard.writeText(shipment.tracking_number);
    toast.success("Tracking copiado");
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/shipments/${shipment.id}`}
        className="text-xs text-muted-foreground hover:text-foreground"
        aria-label="Ver detalle"
      >
        <ArrowRight className="size-4" />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" />}
        >
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={<Link href={`/admin/shipments/${shipment.id}`} />}
          >
            Ver detalle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyTracking}>
            Copiar tracking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
