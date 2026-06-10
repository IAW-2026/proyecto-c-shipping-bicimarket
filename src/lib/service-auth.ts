import { NextRequest, NextResponse } from "next/server";

const SHIPPING_INBOUND_TOKENS = [
  "BUYER_TO_SHIPPING_SERVICE_TOKEN",
  "SELLER_TO_SHIPPING_SERVICE_TOKEN",
] as const;

const SHIPPING_OUTBOUND_TOKEN_BY_APP = {
  buyer: "SHIPPING_TO_BUYER_SERVICE_TOKEN",
  seller: "SHIPPING_TO_SELLER_SERVICE_TOKEN",
  payments: "SHIPPING_TO_PAYMENTS_SERVICE_TOKEN",
} as const;

// Valida que la llamada entrante sea de otra app del marketplace.
// Convención del proyecto: header X-Service-Token con el secret del par
// origen→destino. Shipping acepta llamados entrantes desde Buyer y Seller.
export function requireServiceToken(req: NextRequest) {
  const received = req.headers.get("x-service-token");
  const expectedTokens = SHIPPING_INBOUND_TOKENS.map((envName) => process.env[envName]).filter(
    (value): value is string => Boolean(value),
  );

  if (expectedTokens.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_MISCONFIGURED",
          message:
            "No hay tokens entrantes configurados; revisar BUYER_TO_SHIPPING_SERVICE_TOKEN y SELLER_TO_SHIPPING_SERVICE_TOKEN",
        },
      },
      { status: 500 }
    );
  }

  if (!received || !expectedTokens.includes(received)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "X-Service-Token inválido o ausente" } },
      { status: 401 }
    );
  }

  return null; // OK
}

type ServiceFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
};

// Wrapper para llamar a otra app del marketplace.
// Lee la URL base y el token del par desde las env vars (ver .env.example).
// Reintenta hasta 3 veces con backoff lineal en errores 5xx o de red.
export async function callServiceApi(
  app: "buyer" | "seller" | "shipping" | "payments",
  path: string,
  opts: ServiceFetchOptions = {}
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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Token": token,
    "X-Request-Id": crypto.randomUUID(),
  };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const url = `${baseUrl}${path}`;
  const delays = [1000, 3000, 9000];
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(5000),
      });

      if (res.status >= 500) {
        lastError = new Error(`${app} respondió ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      lastError = err;
    }

    if (attempt < 2) await new Promise((r) => setTimeout(r, delays[attempt]));
  }

  throw lastError ?? new Error(`Falló la llamada a ${app} ${path}`);
}
