import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { LogisticsOperator } from "@/generated/prisma/client";
import { OperatorStatus } from "@/generated/prisma/enums";

/**
 * Helper de auth para route handlers que requieren un operador logístico
 * activo. Patrón documentado en docs/05-usuarios.md §3.1.
 *
 * Comportamiento:
 *   1. Valida JWT con auth() de Clerk. Sin user → null.
 *   2. Busca el LogisticsOperator por clerkUserId.
 *   3. Si no existe → null (los operadores NO se auto-aprovisionan;
 *      los crea un admin con POST /api/v1/logistics-operators).
 *   4. Si existe pero status != active → null.
 *   5. Si existe y está activo, refresca fullName/email si cambiaron en
 *      el JWT (sin webhook de Clerk, snapshot just-in-time).
 *
 * El caller decide qué hacer con null: 403 para endpoints de logistics,
 * permitir para endpoints admin que solo necesitan el claim del JWT.
 *
 * Nota: este helper es distinto de src/lib/auth.ts:getOrCreateLocalUser
 * (que está roto desde que se borró el modelo User). NO los mezcles.
 */
export async function getActiveOperator(): Promise<LogisticsOperator | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const operator = await prisma.logisticsOperator.findUnique({
    where: { clerkUserId: userId },
  });
  if (!operator) return null;
  if (operator.status !== OperatorStatus.active) return null;

  // Sincronizar snapshot del JWT si cambió (lazy provisioning)
  const claims = sessionClaims as Record<string, unknown> | null;
  const claimEmail = typeof claims?.email === "string" ? claims.email : null;
  const claimName =
    typeof claims?.full_name === "string"
      ? claims.full_name
      : typeof claims?.name === "string"
        ? claims.name
        : null;

  const needsSync =
    (claimEmail && claimEmail !== operator.email) ||
    (claimName && claimName !== operator.fullName);

  if (needsSync) {
    return prisma.logisticsOperator.update({
      where: { clerkUserId: userId },
      data: {
        ...(claimEmail && { email: claimEmail }),
        ...(claimName && { fullName: claimName }),
      },
    });
  }

  return operator;
}

/**
 * Lee el flag admin del JWT de Clerk-Shipping.
 * Convención: docs/05 §2 — los admins se marcan con
 * publicMetadata.admin = true desde Clerk Dashboard.
 *
 * Se usa con los sessionClaims que ya tenés de auth():
 *
 *   const { sessionClaims } = await auth();
 *   if (!isAdmin(sessionClaims)) throw new ApiError("FORBIDDEN", 403, ...);
 */
export function isAdmin(sessionClaims: unknown): boolean {
  if (!sessionClaims || typeof sessionClaims !== "object") return false;

  const claims = sessionClaims as Record<string, unknown>;
  const publicMetadata = claims.publicMetadata;

  if (!publicMetadata || typeof publicMetadata !== "object") return false;
  return (publicMetadata as Record<string, unknown>).admin === true;
}
