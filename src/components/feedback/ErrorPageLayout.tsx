import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorPageLayoutProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Tono del icono y eyebrow. */
  tone?: "destructive" | "neutral";
  /** CTA principal — onClick para reset, href para link. */
  cta?: { label: string; href?: string; onClick?: () => void };
  /** CTA secundario opcional (link "Contactar soporte" en 500). */
  ctaSecondary?: { label: string; href?: string; onClick?: () => void };
  /** Slot extra debajo de los CTAs — usado por 500 para el error ID copiable. */
  footer?: React.ReactNode;
}

/**
 * Layout central reutilizado por las 3 páginas de error (403, 404, 500).
 * Cubre los mockups:
 *   - 404 _ Not found.png      → tone="neutral",     SearchX
 *   - 403 _ Forbidden.png      → tone="destructive", Lock
 *   - 500 _ Server error.png   → tone="destructive", OctagonAlert + footer error ID
 */
export function ErrorPageLayout({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  tone = "destructive",
  cta,
  ctaSecondary,
  footer,
}: ErrorPageLayoutProps) {
  const iconBox =
    tone === "destructive"
      ? "bg-destructive/15 text-destructive"
      : "bg-muted text-muted-foreground";
  const eyebrowColor =
    tone === "destructive" ? "text-destructive" : "text-muted-foreground";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div
          className={cn(
            "mx-auto flex size-14 items-center justify-center rounded-xl",
            iconBox,
          )}
        >
          <Icon className="size-7" strokeWidth={1.75} aria-hidden />
        </div>

        <div className="space-y-2">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              eyebrowColor,
            )}
          >
            {eyebrow}
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {(cta || ctaSecondary) && (
          <div className="flex flex-col items-center gap-2 pt-1">
            {cta &&
              (cta.href ? (
                <Link
                  href={cta.href}
                  className={buttonVariants({ size: "lg", className: "w-full" })}
                >
                  {cta.label}
                </Link>
              ) : (
                <Button size="lg" onClick={cta.onClick} className="w-full">
                  {cta.label}
                </Button>
              ))}
            {ctaSecondary &&
              (ctaSecondary.href ? (
                <Link
                  href={ctaSecondary.href}
                  className={buttonVariants({
                    variant: "ghost",
                    className: "w-full",
                  })}
                >
                  {ctaSecondary.label}
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  onClick={ctaSecondary.onClick}
                  className="w-full"
                >
                  {ctaSecondary.label}
                </Button>
              ))}
          </div>
        )}

        {footer}
      </div>
    </main>
  );
}
