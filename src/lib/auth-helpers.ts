import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateId } from "@/lib/ids";
import type { LogisticsOperator } from "@/generated/prisma/client";
import { OperatorStatus, VehicleType } from "@/generated/prisma/enums";

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
 * Lee el flag admin del JWT de Clerk-Shipping (sync, barato).
 * Convención: docs/05 §2 — los admins se marcan con
 * publicMetadata.admin = true desde Clerk Dashboard.
 *
 * Por default el JWT NO incluye publicMetadata. Hay 2 formas de tenerlo:
 *   (a) Clerk Dashboard → Sessions → Customize session token →
 *       { "publicMetadata": "{{user.public_metadata}}" }
 *   (b) Usar `isAdminAsync()` de abajo, que pega a Clerk API.
 *
 * Esta función intenta varios paths del JWT por compatibilidad:
 *   - publicMetadata.admin (custom claim)
 *   - public_metadata.admin (snake_case alternativo)
 *   - metadata.admin
 *   - admin (claim directo)
 */
export function isAdmin(sessionClaims: unknown): boolean {
  if (!sessionClaims || typeof sessionClaims !== "object") return false;

  const claims = sessionClaims as Record<string, unknown>;

  // Path 1: publicMetadata.admin
  const pm = claims.publicMetadata;
  if (pm && typeof pm === "object" && (pm as Record<string, unknown>).admin === true) {
    return true;
  }
  // Path 2: public_metadata.admin (snake_case)
  const sm = claims.public_metadata;
  if (sm && typeof sm === "object" && (sm as Record<string, unknown>).admin === true) {
    return true;
  }
  // Path 3: metadata.admin
  const m = claims.metadata;
  if (m && typeof m === "object" && (m as Record<string, unknown>).admin === true) {
    return true;
  }
  // Path 4: admin directo en el JWT
  if (claims.admin === true) return true;

  return false;
}

/**
 * Versión async — pega a la API de Clerk para leer publicMetadata.admin del
 * user completo. Más caro (1 round-trip a Clerk) pero funciona sin custom
 * session token configurado. Usar SOLO cuando isAdmin(sessionClaims) devuelve
 * false como fallback, o en layouts donde la latencia no importa.
 */
export async function isAdminAsync(): Promise<boolean> {
  // Import lazy para evitar costo en archivos que solo usan isAdmin sync.
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user) return false;
  const pm = user.publicMetadata as Record<string, unknown> | null;
  return pm?.admin === true;
}

/**
 * Combina el check sync del JWT con el fallback async a Clerk API. Devuelve
 * true si el user logueado es admin por cualquiera de las 2 vías. Pensada para
 * route handlers admin:
 *
 *   const { userId, sessionClaims } = await auth();
 *   if (!userId || !(await requireAdmin(sessionClaims))) {
 *     throw new ApiError("FORBIDDEN", 403, "Admin requerido");
 *   }
 */
export async function requireAdmin(sessionClaims: unknown): Promise<boolean> {
  if (isAdmin(sessionClaims)) return true;
  return isAdminAsync();
}

/**
 * Igual que `getActiveOperator()` pero con autoprovisioning en dev:
 * si el user logueado no está vinculado a ningún operador, crea uno
 * automáticamente con datos de Clerk (email + nombre completo) y
 * status=active. El comportamiento está controlado por el env var
 * `AUTO_PROVISION_OPERATORS`:
 *
 *   - "true"  (dev/staging): autoprovision activado.
 *   - cualquier otra cosa (prod): no provisiona, devuelve null
 *     y el caller maneja el 403.
 *
 * Decisión de diseño:
 * - En prod los operadores deben ser invitados por un admin (docs/05 §3.1).
 *   Esa regla queda intacta — no hay autoprovision si la var no está en
 *   "true".
 * - En dev el flujo de invitación es tedioso: cada cuenta de Clerk nueva
 *   tendría que ser vinculada manualmente. Para no fricar el día a día,
 *   activamos el atajo.
 *
 * Reglas extra:
 * - Los admins no se autoprovisionan como operadores (ellos van a /admin/*).
 * - Los campos sensibles (vehicle/license_plate/documento) quedan con
 *   placeholders editables desde /admin/operators/[id].
 * - Si el operador YA EXISTE pero está `suspended` o `inactive`, NO se
 *   reactiva automáticamente — el operador queda bloqueado hasta que un
 *   admin lo reactive desde /admin/operators/[id]. Eso preserva la
 *   intención del admin al suspender.
 */
export async function getOrProvisionOperator(): Promise<LogisticsOperator | null> {
  const existing = await getActiveOperator();
  if (existing) return existing;

  if (process.env.AUTO_PROVISION_OPERATORS !== "true") return null;

  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  // Admins no se autoprovisionan como operadores
  if (isAdmin(sessionClaims) || (await isAdminAsync())) return null;

  // Si YA EXISTE un row para este clerk_user_id (sea cual sea su status),
  // NO lo tocamos ni lo devolvemos. Si está suspended/inactive, los page
  // server components que llamen acá redirigirán a /forbidden — pero hoy
  // la UX cambió: las páginas del dashboard usan `getOperatorRecord()`
  // para permitir navegación read-only del operador suspendido (los botones
  // se deshabilitan en cliente).
  const existingRow = await prisma.logisticsOperator.findUnique({
    where: { clerkUserId: userId },
  });
  if (existingRow) return null;

  // Crear nuevo desde datos de Clerk (solo si no había ningún row previo)
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? `${userId}@dev.local`;
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    email.split("@")[0] ||
    "Operador";

  return prisma.logisticsOperator.create({
    data: {
      id: generateId("lop"),
      clerkUserId: userId,
      fullName,
      email,
      phone: "+54 11 0000-0000",
      documentId: "00000000",
      vehicleType: VehicleType.van,
      licensePlate: "PENDIENTE",
      status: OperatorStatus.active,
    },
  });
}

/**
 * Devuelve el LogisticsOperator del user logueado SIN filtrar por status.
 * Si no existe y `AUTO_PROVISION_OPERATORS=true`, lo crea (igual que
 * `getOrProvisionOperator`). La diferencia clave: si existe pero está
 * `suspended` o `inactive`, igualmente lo devuelve — el caller decide qué
 * hacer (típicamente: dejar navegar pero deshabilitar acciones).
 *
 * Para mutations server-side seguir usando `getActiveOperator()` que filtra
 * estrictamente por `active` y tira 403 si no.
 */
export async function getOperatorRecord(): Promise<LogisticsOperator | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  // Admins no se autoprovisionan
  if (isAdmin(sessionClaims) || (await isAdminAsync())) {
    // Pero si ya tienen un row de operador (caso dev típico), lo devolvemos
    return prisma.logisticsOperator.findUnique({
      where: { clerkUserId: userId },
    });
  }

  const existing = await prisma.logisticsOperator.findUnique({
    where: { clerkUserId: userId },
  });
  if (existing) return existing;

  if (process.env.AUTO_PROVISION_OPERATORS !== "true") return null;

  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? `${userId}@dev.local`;
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    email.split("@")[0] ||
    "Operador";

  return prisma.logisticsOperator.create({
    data: {
      id: generateId("lop"),
      clerkUserId: userId,
      fullName,
      email,
      phone: "+54 11 0000-0000",
      documentId: "00000000",
      vehicleType: VehicleType.van,
      licensePlate: "PENDIENTE",
      status: OperatorStatus.active,
    },
  });
}

/**
 * Decide a qué pantalla landing redirigir a un user recién logueado según su
 * rol. Centralizado acá para que tanto `/` (landing pública) como `/dashboard`
 * (target post-login de Clerk) usen la misma regla:
 *
 *   - Admin                          → /admin/shipments
 *   - Operador activo (vinculado)    → /dashboard/assignments
 *   - Si AUTO_PROVISION_OPERATORS    → autoprovision + /dashboard/assignments
 *   - Ninguno de los dos             → /forbidden
 *
 * Si el user es admin Y también operador (caso típico en dev), gana admin.
 * Los admins pueden ver el dashboard del operador navegando manualmente
 * a /dashboard/assignments.
 */
export async function resolveLandingPath(
  sessionClaims: unknown,
): Promise<string> {
  if (await requireAdmin(sessionClaims)) {
    return "/admin/shipments";
  }
  const operator = await getOrProvisionOperator();
  if (operator) return "/dashboard/assignments";
  return "/forbidden";
}
