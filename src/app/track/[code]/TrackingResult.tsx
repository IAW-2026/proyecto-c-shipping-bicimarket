"use client";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Package as PackageIcon,
  Truck,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/status/StatusBadge";
import { OrderStatusBadge } from "@/components/status/OrderStatusBadge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { OrderShipmentFlow } from "@/components/shipping/OrderShipmentFlow";
import { TrackingTimeline } from "@/components/shipping/TrackingTimeline";
import { ProofImage } from "@/components/shipping/ProofImage";
import { KeepShoppingCarousel } from "@/components/products/KeepShoppingCarousel";
import { useTracking } from "@/hooks/querys/track/useTracking";
import { distanceBetweenPostalCodes } from "@/lib/geo/distance";
import {
  formatDateLong,
  formatDateShort,
  formatWeightKg,
} from "@/lib/format";
import { SERVICE_LEVEL_STYLES } from "@/lib/status-styles";
import type { PublicTrackingProof } from "@/types/public-tracking";

interface TrackingResultProps {
  code: string;
}

export function TrackingResult({ code }: TrackingResultProps) {
  const { data, isLoading, isError, error, refetch } = useTracking(code);

  // 404 explícito (código no existe)
  const notFound =
    isError &&
    (
      error as {
        response?: { data?: { error?: { code?: string } } };
      }
    ).response?.data?.error?.code === "TRACKING_NOT_FOUND";

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={PackageIcon}
        variant="muted"
        title="No encontramos ese envío"
        subtitle={
          <span>
            Revisá que el código <code className="font-mono">{code}</code>{" "}
            esté escrito tal cual lo recibiste, sin espacios. Si persiste,
            escribí a soporte.
          </span>
        }
        cta={{ label: "Volver a buscar", href: "/track" }}
      />
    );
  }

  if (isError || !data) {
    return (
      <ErrorBanner
        title="No pudimos cargar el envío"
        subtitle="Reintentá en unos segundos."
        onRetry={() => refetch()}
      />
    );
  }

  const km = distanceBetweenPostalCodes(
    data.origin.postal_code,
    data.destination.postal_code,
  );

  const pickups = data.order_pickups;
  const isMulti = pickups.length > 1;
  const deliveredCount = pickups.filter((p) => p.status === "delivered").length;
  // Caption del flujo: multi-vendedor → resumen de entregados; envío único →
  // distancia aproximada (lo que antes daba el ShipmentRouteMap).
  const flowCaption = isMulti
    ? `${pickups.length} envíos → ${data.destination.city} · ${deliveredCount}/${pickups.length} entregado`
    : km != null
      ? `≈ ${km} km · ${data.origin.city} → ${data.destination.city}`
      : `${data.origin.city} → ${data.destination.city}`;

  return (
    <div className="space-y-5">
      {/* Header con tracking + status + acciones */}
      <header className="space-y-3">
        <Link
          href="/track"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground print:hidden"
        >
          <ArrowLeft className="size-3.5" />
          Buscar otro pedido
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {data.view === "order"
                ? "Seguimiento del pedido"
                : "Seguimiento del envío"}
            </p>
            <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
              {data.tracking_number}
            </h1>
            {/* ADR-006: vista PEDIDO (BMK, comprador) con varios vendedores →
                explicamos que abajo ve el flujo consolidado. La vista ENVÍO
                (TRK, vendedor) muestra solo ese envío, sin texto extra. */}
            {data.view === "order" && data.order_pickups_count > 1 && (
              <p className="text-[11px] text-muted-foreground">
                Tu pedido tiene{" "}
                <strong className="text-foreground">
                  {data.order_pickups_count} envíos
                </strong>{" "}
                (uno por vendedor). Abajo ves cada uno y el progreso
                consolidado.
              </p>
            )}
          </div>
          {data.view === "order" ? (
            <OrderStatusBadge
              statuses={data.order_pickups.map((p) => p.status)}
            />
          ) : (
            <StatusBadge status={data.status} />
          )}
        </div>
      </header>

      {/* Flujo del pedido: un carril por envío. La vista ENVÍO (TRK) es el caso
          particular de 1 carril. */}
      <OrderShipmentFlow
        pickups={data.order_pickups}
        highlightShipmentId={data.shipment_id}
        caption={flowCaption}
      />

      {/* Resumen + acciones de print */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Origen"
          value={`${data.origin.city}, ${data.origin.province}`}
          mono={data.origin.postal_code}
        />
        <SummaryCard
          label="Destino"
          value={`${data.destination.city}, ${data.destination.province}`}
          mono={data.destination.postal_code}
        />
        <SummaryCard
          label="Servicio"
          value={
            SERVICE_LEVEL_STYLES[data.service_level]?.label ??
            data.service_level
          }
          mono={data.carrier}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Peso"
          value={formatWeightKg(data.weight_grams_total)}
        />
        <SummaryCard
          label="Bultos"
          value={String(data.packages_count)}
        />
        <SummaryCard
          label="Creado"
          value={formatDateShort(data.created_at)}
        />
      </div>

      {/* Prueba(s) de entrega. ADR-006: vista PEDIDO (BMK) puede tener varias
          fotos (una por vendedor) → carrusel; vista ENVÍO (TRK) tiene una sola. */}
      <ProofGallery proofs={data.proofs} />

      {/* Historial: un timeline POR ENVÍO. La vista ENVÍO (TRK) es el caso
          particular de 1 entrada (sin sub-header, se ve igual que antes). */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Historial
        </h2>
        <div className="space-y-5">
          {data.order_timelines.map((t, ti) => (
            <div key={t.shipment_id} className="space-y-2">
              {data.order_timelines.length > 1 && (
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                  <div className="leading-tight">
                    <p className="text-xs font-semibold text-foreground">
                      Envío {ti + 1}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {t.tracking_number} · {t.pickup_city}
                    </p>
                  </div>
                  <StatusBadge status={t.status} size="sm" />
                </div>
              )}
              <TrackingTimeline
                events={t.events.map((e, i) => ({
                  id: `${t.shipment_id}-evt-${i}`,
                  ...e,
                }))}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Acciones (ocultas en print) */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-xs text-muted-foreground">
          Última actualización ·{" "}
          {data.events.length > 0
            ? formatDateLong(data.events[data.events.length - 1].occurred_at)
            : formatDateLong(data.created_at)}
        </p>
        <div className="flex gap-2">
          <Link
            href="/track"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ChevronRight className="size-3.5 rotate-180" />
            Nueva búsqueda
          </Link>
          <Button size="sm" onClick={handlePrint}>
            <Download className="size-3.5" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Seguir comprando: catálogo de la Seller App (sutil, oculto al imprimir) */}
      <KeepShoppingCarousel className="pt-2 print:hidden" />

      {/* Footer estilo "voucher" — solo visible al imprimir */}
      <div className="hidden text-center text-[10px] text-muted-foreground print:block">
        Documento generado el {formatDateLong(new Date())} · BiciMarket
        Logística · ID interno: {data.shipment_id}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: string;
}) {
  return (
    <div className="space-y-1 rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium leading-tight">{value}</p>
      {mono && (
        <p className="font-mono text-[11px] text-muted-foreground">{mono}</p>
      )}
    </div>
  );
}

/**
 * Galería de pruebas de entrega. ADR-006:
 *  - 0 fotos → no renderiza nada.
 *  - 1 foto (típico de TRK, atómico) → tarjeta única, sin carrusel.
 *  - N fotos (PEDIDO BMK con varios vendedores) → carrusel con todas.
 */
function ProofGallery({ proofs }: { proofs: PublicTrackingProof[] }) {
  if (proofs.length === 0) return null;
  if (proofs.length === 1) return <ProofCard proof={proofs[0]} />;

  return (
    <section className="space-y-3 rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-4">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
        <Truck className="size-3" />
        Entregas del pedido · {proofs.length} fotos
      </h2>
      <Carousel className="w-full" opts={{ align: "start" }}>
        <CarouselContent>
          {proofs.map((proof, i) => (
            <CarouselItem key={proof.tracking_number ?? i}>
              <ProofCard proof={proof} embedded />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious type="button" className="left-2" />
        <CarouselNext type="button" className="right-2" />
      </Carousel>
    </section>
  );
}

function ProofCard({
  proof,
  embedded,
}: {
  proof: PublicTrackingProof;
  embedded?: boolean;
}) {
  return (
    <section
      className={
        embedded
          ? "space-y-3"
          : "space-y-3 rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-4"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <Truck className="size-3" />
          {proof.seller_profile_id ? (
            <span className="font-mono normal-case">
              {proof.seller_profile_id}
            </span>
          ) : (
            "Entregado"
          )}
        </h2>
        <span className="text-xs text-muted-foreground">
          {formatDateLong(proof.delivered_at)}
        </span>
      </div>
      <ProofImage
        src={proof.photo_url}
        className="aspect-video w-full rounded-lg border border-border object-cover"
      />
      {proof.note && (
        <p className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs italic text-foreground/80">
          “{proof.note}”
        </p>
      )}
    </section>
  );
}
