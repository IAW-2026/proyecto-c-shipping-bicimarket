import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SHIPPING_INBOUND_TOKENS = [
  "BUYER_TO_SHIPPING_SERVICE_TOKEN",
  "SELLER_TO_SHIPPING_SERVICE_TOKEN",
] as const;

export type InboundServiceCaller = "buyer" | "seller" | "dashboard";

const SHIPPING_INBOUND_TOKEN_BY_CALLER = {
  buyer: "BUYER_TO_SHIPPING_SERVICE_TOKEN",
  seller: "SELLER_TO_SHIPPING_SERVICE_TOKEN",
  dashboard: "DASHBOARD_TO_SHIPPING_SERVICE_TOKEN",
} as const satisfies Record<InboundServiceCaller, string>;

const SHIPPING_OUTBOUND_TOKEN_BY_APP = {
  buyer: "SHIPPING_TO_BUYER_SERVICE_TOKEN",
  seller: "SHIPPING_TO_SELLER_SERVICE_TOKEN",
  payments: "SHIPPING_TO_PAYMENTS_SERVICE_TOKEN",
} as const;

// Valida llamadas entrantes desde otras apps mediante X-Service-Token.
export function requireServiceToken(req: NextRequest) {
  const received = req.headers.get("x-service-token");
  const expectedTokens = SHIPPING_INBOUND_TOKENS.map(
    (envName) => process.env[envName],
  ).filter((value): value is string => Boolean(value));

  if (expectedTokens.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_MISCONFIGURED",
          message:
            "No hay tokens entrantes configurados; revisar BUYER_TO_SHIPPING_SERVICE_TOKEN y SELLER_TO_SHIPPING_SERVICE_TOKEN",
        },
      },
      { status: 500 },
    );
  }

  if (!received || !expectedTokens.includes(received)) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "X-Service-Token invalido o ausente",
        },
      },
      { status: 401 },
    );
  }

  return null;
}

/**
 * Identifica el servicio que firma un request sin otorgarle permisos por si
 * solo. Cada route handler decide que callers acepta. Esto evita que el token
 * read-only de Analytics quede habilitado en los endpoints de escritura que
 * usan requireServiceToken().
 */
export function getInboundServiceCaller(
  req: NextRequest,
): InboundServiceCaller | null {
  const received = req.headers.get("x-service-token");
  if (!received) return null;

  for (const [caller, envName] of Object.entries(
    SHIPPING_INBOUND_TOKEN_BY_CALLER,
  ) as Array<[InboundServiceCaller, string]>) {
    const expected = process.env[envName];
    if (expected && received === expected) return caller;
  }

  return null;
}

export function requireDashboardServiceToken(req: NextRequest) {
  const expected = process.env.DASHBOARD_TO_SHIPPING_SERVICE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_MISCONFIGURED",
          message:
            "DASHBOARD_TO_SHIPPING_SERVICE_TOKEN no esta configurado",
        },
      },
      { status: 500 },
    );
  }

  if (getInboundServiceCaller(req) !== "dashboard") {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "X-Service-Token invalido o ausente",
        },
      },
      { status: 401 },
    );
  }

  return null;
}

type ServiceFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
  timeoutMs?: number;
};

// Llama a otra app y reintenta errores 5xx o de red hasta tres veces.
export async function callServiceApi(
  app: "buyer" | "seller" | "shipping" | "payments",
  path: string,
  opts: ServiceFetchOptions = {},
) {
  const baseUrl = process.env[`${app.toUpperCase()}_API_URL`];
  const tokenEnvName =
    app === "shipping" ? null : SHIPPING_OUTBOUND_TOKEN_BY_APP[app];
  const token = tokenEnvName ? process.env[tokenEnvName] : undefined;

  if (!baseUrl || !token) {
    throw new Error(
      `Falta config para llamar a ${app}: revisar ${app.toUpperCase()}_API_URL y ${tokenEnvName ?? "token saliente"}`,
    );
  }

  const requestId = crypto.randomUUID();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Token": token,
    "X-Request-Id": requestId,
  };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const url = `${baseUrl}${path}`;
  const delays = [1000, 3000, 9000];
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const method = opts.method ?? "GET";
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const attemptNumber = attempt + 1;
    const startedAt = Date.now();

    // Correlaciona el PATCH saliente con los logs de Buyer/Seller. El token
    // nunca se incluye en esta salida.
    logger.info({
      msg: "service-outbound-request",
      target: app,
      method,
      path,
      requestId,
      attempt: attemptNumber,
      timeoutMs,
      payload: opts.body,
    });

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });

      logger.info({
        msg: "service-outbound-response",
        target: app,
        method,
        path,
        requestId,
        attempt: attemptNumber,
        status: res.status,
        ok: res.ok,
        durationMs: Date.now() - startedAt,
      });

      if (res.status >= 500) {
        lastError = new Error(`${app} respondio ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      lastError = err;
      logger.warn({
        msg: "service-outbound-network-error",
        target: app,
        method,
        path,
        requestId,
        attempt: attemptNumber,
        durationMs: Date.now() - startedAt,
        cause: err instanceof Error ? err.message : String(err),
      });
    }

    if (attempt < 2) {
      logger.warn({
        msg: "service-outbound-retry-scheduled",
        target: app,
        method,
        path,
        requestId,
        attempt: attemptNumber,
        nextAttempt: attemptNumber + 1,
        delayMs: delays[attempt],
      });
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }

  throw lastError ?? new Error(`Fallo la llamada a ${app} ${path}`);
}
