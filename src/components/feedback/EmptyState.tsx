import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  /** Tinta del cuadrado que rodea al icono. */
  variant?: "primary" | "muted" | "destructive";
  /** Botón principal — variant default = primary verde-teal. */
  cta?: { label: string; onClick?: () => void; href?: string };
  /** Botón secundario opcional (ghost). */
  ctaSecondary?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

/**
 * Empty state genérico para tablas y listas vacías. Cubre los mockups:
 *   - admin-envios/Empty _ sin data.png (variant="primary", sin CTA)
 *   - admin-envios/Empty _ con filtros.png (variant="muted", 2 CTAs)
 *   - operador-mis-envios/Empty _ al d_a.png (variant="primary", 1 CTA)
 */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  variant = "muted",
  cta,
  ctaSecondary,
  className,
}: EmptyStateProps) {
  const iconBox = {
    primary: "bg-primary/15 text-primary",
    muted: "bg-muted text-muted-foreground",
    destructive: "bg-destructive/15 text-destructive",
  }[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-xl",
          iconBox,
        )}
      >
        <Icon className="size-7" strokeWidth={1.75} />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {title}
        </h3>
        {subtitle && (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {(cta || ctaSecondary) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {cta && (
            <Button
              onClick={cta.onClick}
              {...(cta.href ? { render: <a href={cta.href} /> } : {})}
            >
              {cta.label}
            </Button>
          )}
          {ctaSecondary && (
            <Button
              variant="ghost"
              onClick={ctaSecondary.onClick}
              {...(ctaSecondary.href
                ? { render: <a href={ctaSecondary.href} /> }
                : {})}
            >
              {ctaSecondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
