import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin, getOrProvisionOperator } from "@/lib/auth-helpers";
import { OperatorShipmentDetail } from "./OperatorShipmentDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OperatorShipmentPage({ params }: PageProps) {
  const { id } = await params;
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  // Admin puede ver el detalle como preview de lo que ve el operador.
  // Operador activo también. Cualquier otro caso → 403.
  if (!(await requireAdmin(sessionClaims))) {
    const op = await getOrProvisionOperator();
    if (!op) redirect("/forbidden");
  }

  return <OperatorShipmentDetail shipmentId={id} />;
}
