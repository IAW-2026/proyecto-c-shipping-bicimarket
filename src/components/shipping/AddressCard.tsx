import { ExternalLink, Home, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAddressLine, mapsUrl } from "@/lib/format";
import type { Address } from "@/types/common";

interface AddressCardProps {
  variant: "pickup" | "delivery";
  address: Address;
  /** Texto auxiliar opcional — "Pedales del Plata · Vendedor" o "Recibe María". */
  meta?: string;
  /** Si true, una sola línea con elipsis (para listas mobile). */
  compact?: boolean;
  /** Si true, oculta link a Maps (modo compact). */
  hideMaps?: boolean;
  className?: string;
}

export function AddressCard({
  variant,
  address,
  meta,
  compact = false,
  hideMaps = false,
  className,
}: AddressCardProps) {
  const Icon = variant === "pickup" ? MapPin : Home;
  const iconColor =
    variant === "pickup"
      ? "text-primary"
      : "text-blue-600 dark:text-blue-400";
  const iconBg =
    variant === "pickup"
      ? "bg-primary/10"
      : "bg-blue-500/10";
  const eyebrow = variant === "pickup" ? "RETIRO" : "ENTREGA";

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-foreground",
          className,
        )}
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md",
            iconBg,
            iconColor,
          )}
        >
          <Icon className="size-3" />
        </span>
        <span className="truncate">{formatAddressLine(address)}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            iconBg,
            iconColor,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="flex-1 space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
          <p className="text-sm font-medium text-foreground">
            {address.street} {address.number}
            {address.apartment ? `, ${address.apartment}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {address.city}
            {address.province ? `, ${address.province}` : ""}
            {address.postal_code ? ` · ${address.postal_code}` : ""}
          </p>
          {meta && (
            <p className="pt-1 text-xs text-muted-foreground">{meta}</p>
          )}
        </div>
        {!hideMaps && (
          <a
            href={mapsUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Maps
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </div>
  );
}
