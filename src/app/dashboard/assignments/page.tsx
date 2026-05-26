import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrProvisionOperator } from "@/lib/auth-helpers";
import { MyAssignmentsClient } from "./MyAssignmentsClient";

/**
 * /dashboard/assignments — listado de envíos asignados al operador logueado.
 * Mockups: operador-mis-envios/*
 *
 * Auth:
 *  - Sin sesión → /sign-in
 *  - Operador activo (vinculado en logistics_operators) → render
 *  - Logueado sin operator vinculado + AUTO_PROVISION_OPERATORS=true →
 *    crea el operador con datos de Clerk y renderiza.
 *  - Logueado sin operator vinculado + var off (prod) → /forbidden
 */
export default async function MyAssignmentsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const operator = await getOrProvisionOperator();
  if (!operator) redirect("/forbidden");

  // Snapshot del nombre para el saludo del header
  const user = await currentUser();
  const firstName =
    user?.firstName ?? operator.fullName.split(" ")[0] ?? "operador";

  return <MyAssignmentsClient firstName={firstName} />;
}
