"use client";
import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { SHIPMENT_STATUS_STYLES } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import type { ShipmentStatusHistoryDTO } from "@/types/shipment-status-history";

const SOURCE_LABEL: Record<string, string> = {
  logistics: "Logística",
  admin: "Admin",
  system: "Sistema",
};

const SOURCE_TONE: Record<string, string> = {
  logistics: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  admin: "bg-primary/15 text-primary",
  system: "bg-muted text-muted-foreground",
};

export function AuditHistoryTable({
  history,
}: {
  history: ShipmentStatusHistoryDTO[];
}) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin cambios de estado registrados aún.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">De</th>
            <th className="pb-2 pr-3 font-medium" aria-label="flecha" />
            <th className="pb-2 pr-3 font-medium">A</th>
            <th className="pb-2 pr-3 font-medium">Fuente</th>
            <th className="pb-2 pr-3 font-medium">Cuándo</th>
            <th className="pb-2 font-medium">Payload</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <Row key={h.id} h={h} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ h }: { h: ShipmentStatusHistoryDTO }) {
  const [open, setOpen] = useState(false);
  const fromLabel = SHIPMENT_STATUS_STYLES[h.from_status]?.label ?? h.from_status;
  const toLabel = SHIPMENT_STATUS_STYLES[h.to_status]?.label ?? h.to_status;
  const hasPayload = h.payload != null;

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-2 pr-3 text-xs text-muted-foreground">{fromLabel}</td>
        <td className="py-2 pr-3 text-muted-foreground">
          <ArrowRight className="size-3.5" aria-hidden />
        </td>
        <td className="py-2 pr-3 text-sm font-medium text-foreground">
          {toLabel}
        </td>
        <td className="py-2 pr-3">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
              SOURCE_TONE[h.source] ?? "bg-muted",
            )}
          >
            {SOURCE_LABEL[h.source] ?? h.source}
          </span>
        </td>
        <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground">
          {formatDateShort(h.occurred_at)}
        </td>
        <td className="py-2">
          {hasPayload ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {open ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              {open ? "Ocultar" : "Ver"}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      </tr>
      {hasPayload && open && (
        <tr className="border-b border-border bg-muted/40">
          <td colSpan={6} className="px-3 py-2">
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
              {JSON.stringify(h.payload, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
