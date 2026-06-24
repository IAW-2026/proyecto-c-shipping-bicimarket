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
import type { ShipmentGroupDTO } from "@/types/shipment-groups";

// 8 tintes determinísticos para distinguir grupos de pedidos en la lista.
// Mismo orderId → mismo color, sin agregar dependencias.
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

export const columnsShipmentGroups: ColumnDef<ShipmentGroupDTO>[] = [
  {
    id: "order_tracking_number",
    header: "Tracking del pedido",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.original.aggregate.order_tracking_number}
        </span>
        <OrderChip orderId={row.original.order_id} />
      </div>
    ),
  },
  {
    id: "origins",
    header: "Orígenes",
    cell: ({ row }) => <OriginsCell group={row.original} />,
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <StatusBadge
          status={row.original.aggregate.rollup_status}
          size="sm"
        />
        {row.original.aggregate.origins_count > 1 && (
          <StatusBreakdown breakdown={row.original.aggregate.status_breakdown} />
        )}
      </div>
    ),
  },
  {
    id: "destination",
    header: "Destino",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.aggregate.shipping_address.city}
      </span>
    ),
  },
  {
    id: "weight",
    header: "Peso total",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {formatWeightKg(row.original.aggregate.total_weight_grams)}
      </span>
    ),
  },
  {
    id: "cost",
    header: "Costo",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {formatCostArs(row.original.aggregate.total_cost_cents)}
      </span>
    ),
  },
  {
    id: "created_at",
    header: () => <ServerSortButton columnId="created_at" title="Creado" />,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDateShort(row.original.aggregate.earliest_created_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <RowActions group={row.original} />,
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

/**
 * Celda "Orígenes": en pedidos single-origen muestra el pickup + tracking
 * individual. En multi-vendedor lista los N pickups (ciudad + tracking
 * individual de cada uno), encabezado con un pill que cuenta los vendedores.
 */
function OriginsCell({ group }: { group: ShipmentGroupDTO }) {
  const { aggregate, shipments } = group;
  if (aggregate.origins_count === 1) {
    const only = shipments[0];
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-foreground">
          {only.pickup_address_snapshot.city}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {only.tracking_number}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
        {aggregate.origins_count} vendedores
      </span>
      <ul className="space-y-0.5">
        {shipments.map((s) => (
          <li key={s.id} className="flex items-baseline gap-2">
            <span className="text-[11px] text-foreground">
              {s.pickup_address_snapshot.city}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {s.tracking_number}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Mini pills con el conteo por estado dentro de un grupo multi-vendedor.
 * Solo se renderiza cuando hay >1 shipment.
 */
function StatusBreakdown({
  breakdown,
}: {
  breakdown: ShipmentGroupDTO["aggregate"]["status_breakdown"];
}) {
  const entries = Object.entries(breakdown).filter(
    ([, count]) => (count ?? 0) > 0,
  );
  if (entries.length <= 1) return null;
  return (
    <span
      className="text-[10px] text-muted-foreground"
      title={entries
        .map(([status, count]) => `${count} ${status}`)
        .join(" · ")}
    >
      ({entries.length} estados)
    </span>
  );
}

function formatCostArs(cents: number): string {
  const ars = cents / 100;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(ars);
}

function RowActions({ group }: { group: ShipmentGroupDTO }) {
  const firstShipment = group.shipments[0];

  function copyOrderId() {
    navigator.clipboard.writeText(group.order_id);
    toast.success("Order ID copiado");
  }

  function copyTrackingNumbers() {
    const all = group.shipments.map((s) => s.tracking_number).join(", ");
    navigator.clipboard.writeText(all);
    toast.success(
      group.shipments.length === 1
        ? "Tracking copiado"
        : `${group.shipments.length} trackings copiados`,
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/shipments/${firstShipment.id}`}
        className="text-xs text-muted-foreground hover:text-foreground"
        aria-label="Ver detalle del primer envío del pedido"
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
          {group.shipments.map((s) => (
            <DropdownMenuItem
              key={s.id}
              render={<Link href={`/admin/shipments/${s.id}`} />}
            >
              Ver {truncateId(s.id, 6, 3)} ·{" "}
              <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                {s.tracking_number}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={copyOrderId}>
            Copiar order_id
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyTrackingNumbers}>
            {group.shipments.length === 1
              ? "Copiar tracking"
              : "Copiar todos los trackings"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
