import { NextRequest, NextResponse } from "next/server";

// Valida que la llamada entrante sea de otra app del marketplace.
// Convención del proyecto: header X-Service-Token con el secret de esta app.
// Cada par origen→destino comparte un secret; este endpoint solo conoce el suyo.
export function requireServiceToken(req: NextRequest) {
  const expected = process.env.INCOMING_SERVICE_TOKEN;
  const received = req.headers.get("x-service-token");

  if (!expected) {
    return NextResponse.json(
      { error: { code: "SERVER_MISCONFIGURED", message: "INCOMING_SERVICE_TOKEN no está seteado" } },
      { status: 500 }
    );
  }

  if (!received || received !== expected) {
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
  const token = process.env[`${app.toUpperCase()}_SERVICE_TOKEN`];

  if (!baseUrl || !token) {
    throw new Error(`Falta config para llamar a ${app}: revisar ${app.toUpperCase()}_API_URL y ${app.toUpperCase()}_SERVICE_TOKEN`);
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
