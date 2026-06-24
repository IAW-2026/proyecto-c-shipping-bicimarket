import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { resolveLandingPath } from "@/lib/auth-helpers";

/**
 * Target post-login de Clerk (`NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`).
 * No tiene UI propia — funciona como router por rol:
 *
 *   - Admin                       → /admin/shipments
 *   - Operador activo vinculado   → /dashboard/assignments
 *   - Ninguno                     → /forbidden
 *
 * La regla vive en `resolveLandingPath` para que la usen también `/` y
 * cualquier otro punto que necesite enrutar por rol.
 */
export default async function DashboardPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  const target = await resolveLandingPath(sessionClaims);
  redirect(target);
}
