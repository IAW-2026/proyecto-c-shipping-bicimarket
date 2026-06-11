// Logger estructurado JSON. Sale por console.log/warn/error para que Dokploy /
// Vercel / cualquier captor de stdout lo parsee. No usamos pino/winston por
// simplicidad — para sprint 1 console + JSON es suficiente.
//
// Convención de niveles especiales:
//   level: "outbound-deferred"  → llamada saliente a otra app que está
//                                  mockeada/diferida en sprint 1 (ADR-002).
//                                  Loguear el payload exacto que se hubiera
//                                  enviado, para auditoría y eventual replay.
//   level: "outbound-failed"     → sprint 2: outbound real falló tras los 3
//                                  retries de callServiceApi. No rollbackear.

type LogLevel =
  | "info"
  | "warn"
  | "error"
  | "outbound-deferred"
  | "outbound-failed";

interface LogEntry {
  ts: string;
  level: LogLevel;
  requestId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, payload: Record<string, unknown>) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    ...payload,
  };
  const json = JSON.stringify(entry);

  if (level === "error" || level === "outbound-failed") {
    console.error(json);
  } else if (level === "warn") {
    console.warn(json);
  } else {
    console.log(json);
  }
}

export const logger = {
  info(payload: Record<string, unknown>) {
    emit("info", payload);
  },
  warn(payload: Record<string, unknown>) {
    emit("warn", payload);
  },
  error(payload: Record<string, unknown>) {
    emit("error", payload);
  },
  /**
   * Para sprint 1: en lugar de llamar a callServiceApi, loguear con este nivel
   * el payload exacto que se hubiera enviado. Sprint 2 reemplaza estas líneas
   * por las llamadas reales.
   */
  outboundDeferred(payload: {
    target: "buyer" | "seller" | "payments";
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    payload?: unknown;
    requestId?: string;
  }) {
    emit("outbound-deferred", payload as unknown as Record<string, unknown>);
  },
  outboundFailed(payload: {
    target: "buyer" | "seller" | "payments";
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    payload?: unknown;
    shipmentId?: string;
    upstreamStatus?: number;
    cause?: string;
    requestId?: string;
  }) {
    emit("outbound-failed", payload as unknown as Record<string, unknown>);
  },
};
