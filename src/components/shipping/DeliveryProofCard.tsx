"use client";
import { Camera, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDeliveryProof } from "@/hooks/querys/shipments/useDeliveryProof";
import type { ShipmentStatus } from "@/types/shipments";

interface DeliveryProofCardProps {
  shipmentId: string;
  /** Status actual del shipment. Si no es delivered, no fetcheamos. */
  status: ShipmentStatus;
  className?: string;
}

/**
 * Card que muestra la prueba de entrega: foto + nota + fecha. Usada en
 * el detalle admin y en el detalle operador (cuando el shipment ya fue
 * entregado).
 *
 * Si el shipment no está en status=delivered o todavía no hay row en
 * `delivery_proofs`, no renderiza nada.
 */
export function DeliveryProofCard({
  shipmentId,
  status,
  className,
}: DeliveryProofCardProps) {
  const enabled = status === "delivered" || status === "returned";
  const { data: proof, isLoading, isError } = useDeliveryProof(
    shipmentId,
    enabled,
  );

  if (!enabled) return null;
  if (isError) return null; // 404 = no hay proof aún, no mostramos error
  if (!proof && !isLoading) return null;

  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Camera className="size-3" />
        Prueba de entrega
      </h2>

      {isLoading || !proof ? (
        <Skeleton className="aspect-video w-full" />
      ) : (
        <>
          {proof.proof_photo_url ? (
            <a
              href={proof.proof_photo_url}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-lg border border-border"
              aria-label="Abrir foto en tamaño completo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proof.proof_photo_url}
                alt="Prueba de entrega"
                className="aspect-video w-full bg-muted object-cover transition-opacity group-hover:opacity-90"
                loading="lazy"
              />
            </a>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
              <Camera className="size-5" strokeWidth={1.5} />
              <span>Entrega sin foto</span>
            </div>
          )}

          <div className="space-y-1.5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">Entregado</span>
              <span className="text-xs tabular-nums">
                {formatDateShort(proof.delivered_at)}
              </span>
            </div>
            {proof.note && (
              <p className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs italic text-foreground/80">
                “{proof.note}”
              </p>
            )}
          </div>

          {proof.proof_photo_url && (
            <a
              href={proof.proof_photo_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Abrir foto en pestaña nueva
              <ExternalLink className="size-3" />
            </a>
          )}
        </>
      )}
    </section>
  );
}
