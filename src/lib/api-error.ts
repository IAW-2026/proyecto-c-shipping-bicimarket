import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";

interface ApiErrorBodyOut {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Error tipado del dominio. Se tira desde los route handlers con un código
 * normalizado (SCREAMING_SNAKE_CASE) + HTTP status apropiado.
 * El catch del handler llama a handleApiError(err) que lo serializa al shape
 * { error: { code, message, details } } documentado en docs/03 §0.3.
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toResponse(): NextResponse<ApiErrorBodyOut> {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          ...(this.details !== undefined && { details: this.details }),
        },
      },
      { status: this.status },
    );
  }
}

/**
 * Mapeo central de errores a respuesta HTTP. Usar SIEMPRE en el catch final
 * de los route handlers:
 *
 *   try { ... } catch (err) { return handleApiError(err); }
 */
export function handleApiError(err: unknown): NextResponse<ApiErrorBodyOut> {
  if (err instanceof ApiError) {
    return err.toResponse();
  }

  if (err instanceof ZodError) {
    return new ApiError("BAD_REQUEST", 400, "Body inválido", {
      issues: err.issues,
    }).toResponse();
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return new ApiError("CONFLICT", 409, "Recurso duplicado", {
        target: err.meta?.target,
      }).toResponse();
    }
    if (err.code === "P2025") {
      return new ApiError(
        "NOT_FOUND",
        404,
        "Recurso inexistente",
      ).toResponse();
    }
  }

  console.error("[handleApiError] unhandled:", err);
  return new ApiError(
    "INTERNAL",
    500,
    "Error inesperado del servidor",
  ).toResponse();
}
