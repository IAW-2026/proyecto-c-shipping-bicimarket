"use client";

import { OctagonAlert } from "lucide-react";
import { ErrorPageLayout } from "@/components/feedback/ErrorPageLayout";
import { toast } from "sonner";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorId = error.digest ?? "unknown";
  const ts = new Date().toISOString();

  function copyId() {
    navigator.clipboard.writeText(`${errorId} · ${ts}`);
    toast.success("Error ID copiado");
  }

  return (
    <ErrorPageLayout
      icon={OctagonAlert}
      tone="destructive"
      eyebrow="Error 500"
      title="Algo salió mal"
      subtitle="Reintentá en unos segundos. Si persiste, mandanos el error ID por soporte."
      cta={{ label: "Reintentar", onClick: reset }}
      ctaSecondary={{
        label: "Contactar soporte",
        href: "mailto:soporte@bicimarket.com",
      }}
      footer={
        <button
          type="button"
          onClick={copyId}
          className="mx-auto block rounded-lg border border-border bg-muted/40 px-3 py-2 text-left font-mono text-[11px] leading-relaxed text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Copiar error ID"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Error ID
          </span>
          <span className="block">
            {errorId} · {ts}
          </span>
        </button>
      }
    />
  );
}
