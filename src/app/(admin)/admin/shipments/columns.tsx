"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import type { ShipmentDTO } from "@/types/shipments";

// 8 tintes determinísticos para distinguir grupos de pedidos (mismo order_id
// → mismo color) sin agregar dependencias. El chip de "Pedido" en cada fila
// usa este color como background — agrupación visual sin tocar la DataTable.
const ORDER_TINTS = [
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
];

function orderTint(orderId: string): string {
  let h = 0;
  for (let i = 0; i < orderId.length; i++) {
    h = (h * 31 + orderId.charCodeAt(i)) >>> 0;
  }
  return ORDER_TINTS[h % ORDER_TINTS.length];
}

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
    accessorKey: "order_id",
    header: "Pedido",
    cell: ({ row }) => <OrderChip orderId={row.original.order_id} />,
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

function OrderChip({ orderId }: { orderId: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const params = new URLSearchParams(window.location.search);
        params.set("order_id", orderId);
        params.set("page", "1");
        router.push(`?${params.toString()}`);
      }}
      title={`Filtrar por pedido ${orderId}`}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-medium transition-opacity hover:opacity-80",
        orderTint(orderId),
      )}
    >
      {truncateId(orderId, 6, 4)}
    </button>
  );
}

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
