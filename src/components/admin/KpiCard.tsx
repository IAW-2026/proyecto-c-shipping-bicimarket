import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /** Delta % vs período anterior. Positivo verde, negativo rojo, 0 muted. */
  delta?: number;
  /** Sufijo del delta — ej "hoy", "vs ayer", "30D". */
  deltaSuffix?: string;
  /** Mini sparkline. Acepta números arbitrarios; se escalan al alto del SVG. */
  sparkline?: number[];
  className?: string;
}

/**
 * Card de KPI con sparkline opcional. Las 4 cards arriba de las tablas admin
 * (envios y operadores) usan este componente.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaSuffix,
  sparkline,
  className,
}: KpiCardProps) {
  const tone =
    delta == null ? "neutral" : delta > 0 ? "up" : delta < 0 ? "down" : "neutral";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <Icon className="size-4 text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          {delta != null && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                tone === "up" && "text-emerald-600 dark:text-emerald-400",
                tone === "down" && "text-destructive",
                tone === "neutral" && "text-muted-foreground",
              )}
            >
              {tone === "up" && <ArrowUpRight className="size-3" />}
              {tone === "down" && <ArrowDownRight className="size-3" />}
              {tone === "neutral" && <Minus className="size-3" />}
              <span>
                {delta > 0 ? "+" : ""}
                {delta}
                {deltaSuffix ? ` ${deltaSuffix}` : ""}
              </span>
            </div>
          )}
        </div>

        {sparkline && sparkline.length > 1 && (
          <Sparkline values={sparkline} tone={tone} />
        )}
      </div>
    </div>
  );
}

function Sparkline({
  values,
  tone,
}: {
  values: number[];
  tone: "up" | "down" | "neutral";
}) {
  const width = 80;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const stroke =
    tone === "up"
      ? "stroke-emerald-500"
      : tone === "down"
        ? "stroke-destructive"
        : "stroke-primary";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("opacity-80", stroke)}
      />
    </svg>
  );
}
