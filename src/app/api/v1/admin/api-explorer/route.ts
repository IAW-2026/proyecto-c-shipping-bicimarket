// POST /api/v1/admin/api-explorer — herramienta interna del admin (JWT admin).
// NO es un contrato inter-app: es el backend del playground "Try it" de
// /admin/api-docs. Ejecuta, del lado del servidor, una llamada a uno de los
// endpoints S2S que Shipping expone para otras apps.
//
// ¿Por qué un proxy? Los endpoints S2S (SH1–SH4) se autentican con
// `X-Service-Token: INCOMING_SERVICE_TOKEN`, que es un secreto server-side y
// NO puede viajar al navegador. Este handler:
//   1. Verifica que el caller sea admin (Clerk JWT + requireAdmin).
//   2. Valida que el path pedido esté en la allowlist del contrato S2S.
//   3. Inyecta el X-Service-Token del lado del servidor y reenvía la llamada
//      al endpoint real (same-origin).
//   4. Devuelve { status, ok, duration_ms, body } SIN propagar el código de
//      estado del upstream (un 409 del endpoint real se reporta como 200 acá,
//      con el detalle adentro) para que el playground pueda mostrarlo sin que
//      axios lo trate como error.
//
// Seguridad: solo admins llegan acá; solo se reenvían paths same-origin del
// contrato S2S; el token nunca sale del servidor.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";

// Solo el contrato S2S que Shipping EXPONE para otras apps (SH1–SH4).
// Cualquier otro path (operadores, admin, assignments, deliver…) se rechaza:
// no son endpoints inter-app y no deben ejecutarse con el service token.
const ALLOWED_PATH = /^\/api\/v1\/(shipping-quotes|shipments)(\/[^?]*)?(\?.*)?$/;

// Headers que el cliente puede setear (el resto se ignora). El X-Service-Token
// y el X-Request-Id los pone el servidor; nunca se aceptan del cliente.
const FORWARDABLE_HEADERS = new Set(["idempotency-key", "content-type"]);

const requestSchema = z.object({
  method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]),
  path: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Solo admin
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const { method, path, headers, body } = requestSchema.parse(
      await req.json(),
    );

    // 2. Allowlist de paths del contrato S2S + anti-SSRF
    if (
      !path.startsWith("/api/v1/") ||
      path.includes("..") ||
      !ALLOWED_PATH.test(path)
    ) {
      throw new ApiError(
        "BAD_REQUEST",
        400,
        "El path no pertenece al contrato S2S que Shipping expone",
        { path },
      );
    }

    const token = process.env.INCOMING_SERVICE_TOKEN;
    if (!token) {
      throw new ApiError(
        "SERVER_MISCONFIGURED",
        500,
        "INCOMING_SERVICE_TOKEN no está seteado; no se puede ejecutar la llamada S2S",
      );
    }

    // 3. Inyectar token + reenviar same-origin
    const outboundHeaders: Record<string, string> = {
      "X-Service-Token": token,
      "X-Request-Id": crypto.randomUUID(),
      "User-Agent": "bicimarket-shipping-api-explorer/1.0",
    };
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (FORWARDABLE_HEADERS.has(k.toLowerCase())) outboundHeaders[k] = v;
      }
    }

    const hasBody = method !== "GET" && body !== undefined && body !== null;
    if (hasBody && !outboundHeaders["Content-Type"]) {
      outboundHeaders["Content-Type"] = "application/json";
    }

    const target = `${req.nextUrl.origin}${path}`;
    const startedAt = Date.now();

    let upstream: Response;
    try {
      upstream = await fetch(target, {
        method,
        headers: outboundHeaders,
        body: hasBody ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      throw new ApiError(
        isTimeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR",
        502,
        isTimeout
          ? "El endpoint no respondió a tiempo (10s)"
          : "No se pudo ejecutar la llamada al endpoint",
        { target: path },
      );
    }

    const durationMs = Date.now() - startedAt;
    const contentType = upstream.headers.get("content-type");
    const rawText = await upstream.text();

    // 4. Parsear si es JSON; si no, devolver el texto crudo.
    let parsedBody: unknown = rawText;
    if (contentType?.includes("application/json") && rawText) {
      try {
        parsedBody = JSON.parse(rawText);
      } catch {
        parsedBody = rawText;
      }
    }

    // Siempre 200 desde el proxy: el status real del upstream va en el body.
    return NextResponse.json({
      status: upstream.status,
      ok: upstream.ok,
      duration_ms: durationMs,
      content_type: contentType,
      body: parsedBody,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
