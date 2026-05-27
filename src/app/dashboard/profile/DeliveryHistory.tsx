"use client";
import { useState } from "react";
import Link from "next/link";
import { Boxes, CheckCircle2, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useMyDeliveries } from "@/hooks/querys/assignments/useMyDeliveries";
import { formatDateShort, formatWeightKg } from "@/lib/format";
import type { MyDeliveryDTO } from "@/types/assignments";

const PAGE_SIZE = 10;

/**
 * Historial de entregas finalizadas del operador logueado. Se renderiza
 * debajo del formulario de perfil. Lista paginada (Cargar más) con tarjetas
 * compactas — cada una linkea al detalle del shipment por si quiere mirar la
 * prueba de entrega.
 */
export function DeliveryHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isFetching } = useMyDeliveries(
    page,
    PAGE_SIZE,
  );

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold">
          Historial de entregas
        </h2>
        <p className="text-xs text-muted-foreground">
          Envíos que ya finalizaste. Se ordenan por fecha de entrega (más
          recientes primero).
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <DeliveryCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <ErrorBanner
          title="No pudimos cargar tu historial"
          onRetry={() => refetch()}
        />
      )}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="Todavía no entregaste envíos"
          subtitle="Cuando completes uno, te va a quedar acá registrado."
          variant="muted"
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <ul className="space-y-2">
            {data.data.map((d) => (
              <li key={d.id}>
                <DeliveryCard delivery={d} />
              </li>
            ))}
          </ul>

          {data.pagination.has_more && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
              >
                {isFetching ? "Cargando…" : "Cargar más"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function DeliveryCard({ delivery }: { delivery: MyDeliveryDTO }) {
  const addr = delivery.shipping_address;
  return (
    <Link
      href={`/dashboard/shipments/${delivery.shipment_id}`}
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/30"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <CheckCircle2 className="size-5" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-mono text-sm font-semibold">
            {delivery.tracking_number}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatDateShort(delivery.delivered_at)}
          </span>
        </div>

        <p className="truncate text-xs text-muted-foreground">
          {addr.street} {addr.number}
          {addr.apartment ? `, ${addr.apartment}` : ""} · {addr.city}
        </p>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Package className="size-3" />
            {formatWeightKg(delivery.weight_grams_total)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Boxes className="size-3" />
            {delivery.packages_count}{" "}
            {delivery.packages_count === 1 ? "bulto" : "bultos"}
          </span>
        </div>
      </div>

      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function DeliveryCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <Skeleton className="size-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
