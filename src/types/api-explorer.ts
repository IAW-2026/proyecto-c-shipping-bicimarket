// Tipos del API Explorer del admin (/admin/api-docs). El explorer documenta y
// ejecuta los endpoints S2S que Shipping expone para otras apps. La ejecución
// pasa por el proxy admin-only POST /api/v1/admin/api-explorer.

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Body que el frontend manda al proxy para ejecutar una llamada. */
export interface ApiCallBody {
  method: HttpMethod;
  /** Path absoluto same-origin, ej "/api/v1/shipments/shp_123/packages". */
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

/** Resultado que devuelve el proxy: la respuesta del endpoint real, envuelta. */
export interface ApiCallResult {
  /** Status HTTP real del endpoint upstream (200, 201, 409, …). */
  status: number;
  ok: boolean;
  duration_ms: number;
  content_type: string | null;
  body: unknown;
}

// ── Catálogo (spec estática que renderiza la doc tipo Swagger) ───────────────

export interface ParamSpec {
  name: string;
  in: "path" | "query" | "header";
  required: boolean;
  description: string;
  /** Valor de ejemplo con el que se precarga el form. */
  example: string;
  /** Si está, el input es un select. */
  enum?: string[];
}

export interface ErrorSpec {
  code: string;
  status: number;
  when: string;
}

export interface EndpointSpec {
  id: string;
  /** Grupo: "SH1 · Cotizaciones", etc. */
  tag: string;
  method: HttpMethod;
  /** Template con {param}, ej "/api/v1/shipments/{shipmentId}/packages". */
  path: string;
  summary: string;
  description: string;
  /** Quién lo llama: "Buyer App", "Seller App", "Carrier / integración". */
  caller: string;
  /** Auth requerida, ej "X-Service-Token (S2S)". */
  auth: string;
  params: ParamSpec[];
  /** Ejemplo de body precargado en el editor (objeto serializable). */
  requestBody?: unknown;
  responseStatus: number;
  responseExample: unknown;
  errors: ErrorSpec[];
  notes?: string[];
}
