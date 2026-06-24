import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOperatorRecord } from "@/lib/auth-helpers";
import { MyAssignmentsClient } from "./MyAssignmentsClient";
import type { OperatorStatus } from "@/types/logistics-operators";

/**
 * /dashboard/assignments — listado de envíos asignados al operador logueado.
 * Mockups: operador-mis-envios/*
 *
 * Auth:
 *  - Sin sesión → /sign-in
 *  - Sin operator vinculado y AUTO_PROVISION_OPERATORS=false → /forbidden
 *  - Operador vinculado (cualquier status) → render
 *
 * Si el operador está `suspended` o `inactive`, igual entra y ve sus
 * envíos — el `MyAssignmentsClient` muestra un banner explicando y
 * deshabilita los botones de acción.
 */
export default async function MyAssignmentsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const operator = await getOperatorRecord();
  if (!operator) redirect("/forbidden");

  // Snapshot del nombre para el saludo del header
  const user = await currentUser();
  const firstName =
    user?.firstName ?? operator.fullName.split(" ")[0] ?? "operador";

  return (
    <MyAssignmentsClient
      firstName={firstName}
      operatorStatus={operator.status as OperatorStatus}
    />
  );
}
