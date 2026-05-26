import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin, getOperatorRecord } from "@/lib/auth-helpers";
import { OperatorShipmentDetail } from "./OperatorShipmentDetail";
import type { OperatorStatus } from "@/types/logistics-operators";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OperatorShipmentPage({ params }: PageProps) {
  const { id } = await params;
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  // Admin entra como preview (siempre active a efectos de UI).
  // Operador entra independiente del status — la UI deshabilita botones
  // si está suspended/inactive y muestra banner explicativo.
  let operatorStatus: OperatorStatus = "active";
  if (!(await requireAdmin(sessionClaims))) {
    const op = await getOperatorRecord();
    if (!op) redirect("/forbidden");
    operatorStatus = op.status as OperatorStatus;
  }

  return (
    <OperatorShipmentDetail
      shipmentId={id}
      operatorStatus={operatorStatus}
    />
  );
}
