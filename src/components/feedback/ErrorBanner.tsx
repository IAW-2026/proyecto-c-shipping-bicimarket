import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Banner inline para errores recuperables. Cubre el mockup
 * `admin-envios/Error _ fallo de red.png`. NO bloquea la UI — se renderiza
 * arriba del contenido y deja al usuario seguir viendo lo que estaba.
 */
export function ErrorBanner({
  title = "Algo no cargó",
  subtitle = "Reintentá. Si persiste, contactá a ops@bicimarket.com",
  onRetry,
  className,
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3",
        className,
      )}
    >
      <AlertCircle
        className="mt-0.5 size-5 shrink-0 text-destructive"
        aria-hidden
      />
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-semibold text-destructive">{title}</p>
        <p className="text-xs text-destructive/80">{subtitle}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-destructive/30 text-destructive hover:bg-destructive/15"
        >
          <RefreshCw className="size-3.5" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
