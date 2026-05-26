import { cn } from "@/lib/utils";
import { formatRelative, formatDateShort } from "@/lib/format";
import { SHIPMENT_STATUS_STYLES } from "@/lib/status-styles";
import type {
  TrackingEventDTO,
  TrackingEventType,
} from "@/types/tracking-events";
import type { ShipmentStatus } from "@/types/shipments";

interface TrackingTimelineProps {
  events: TrackingEventDTO[];
  /** Cuántos eventos mostrar como máximo. Default: todos. */
  limit?: number;
  className?: string;
}

/**
 * Timeline cronológico de tracking events. Usa los mismos colores que los
 * StatusBadge para que cada paso sea reconocible al primer vistazo.
 * Cubre los mockups del operador (`Status _ X.png`) y la card "Tracking events"
 * del detalle admin.
 */
export function TrackingTimeline({
  events,
  limit,
  className,
}: TrackingTimelineProps) {
  // Más reciente primero
  const ordered = [...events].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
  const list = typeof limit === "number" ? ordered.slice(0, limit) : ordered;

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin eventos registrados aún.
      </p>
    );
  }

  return (
    <ol className={cn("space-y-4", className)}>
      {list.map((ev, idx) => (
        <TimelineItem
          key={ev.id}
          event={ev}
          isLast={idx === list.length - 1}
        />
      ))}
    </ol>
  );
}

function TimelineItem({
  event,
  isLast,
}: {
  event: TrackingEventDTO;
  isLast: boolean;
}) {
  const style = mapEventToStyle(event.event_type);

  return (
    <li className="relative flex gap-3">
      {/* Rail vertical */}
      {!isLast && (
        <span
          className="absolute left-[7px] top-4 h-full w-px bg-border"
          aria-hidden
        />
      )}
      {/* Dot */}
      <span
        className={cn(
          "z-10 mt-1 size-4 shrink-0 rounded-full border-2",
          style.dotClasses,
        )}
        aria-hidden
      />
      {/* Content */}
      <div className="flex-1 space-y-0.5 pb-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{style.label}</p>
          <time
            className="text-xs text-muted-foreground"
            dateTime={event.occurred_at}
            title={formatDateShort(event.occurred_at)}
          >
            {formatRelative(event.occurred_at)}
          </time>
        </div>
        {event.location && (
          <p className="text-xs text-muted-foreground">{event.location}</p>
        )}
        {event.note && (
          <p className="text-xs text-foreground/80">{event.note}</p>
        )}
      </div>
    </li>
  );
}

function mapEventToStyle(eventType: TrackingEventType): {
  label: string;
  dotClasses: string;
} {
  // Reusamos labels y tints de status-styles para consistencia visual.
  const asShipment = SHIPMENT_STATUS_STYLES[eventType as ShipmentStatus];
  if (asShipment) {
    return {
      label: asShipment.label,
      dotClasses: cn(
        "bg-background",
        // Inferimos el color del borde del badge para el dot.
        asShipment.classes
          .split(" ")
          .find((c) => c.startsWith("border-")) ?? "border-border",
      ),
    };
  }
  return { label: eventType, dotClasses: "bg-background border-border" };
}
