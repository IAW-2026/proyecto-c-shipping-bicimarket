import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin, getOperatorRecord } from "@/lib/auth-helpers";
import { OrderDetailClient } from "./OrderDetailClient";
import type { OperatorStatus } from "@/types/logistics-operators";

interface PageProps {
  params: Promise<{ code: string }>;
}

// ADR-006: vista detalle del PEDIDO completo (BMK) para el operador. Acá ve el
// flujo consolidado, retira cada envío (TRK) y avanza el flujo entero cuando
// están todos retirados. `code` es el tracking global BMK-… (o grp_…).
export default async function OperatorOrderPage({ params }: PageProps) {
  const { code } = await params;
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  let operatorStatus: OperatorStatus = "active";
  if (!(await requireAdmin(sessionClaims))) {
    const op = await getOperatorRecord();
    if (!op) redirect("/forbidden");
    operatorStatus = op.status as OperatorStatus;
  }

  return (
    <OrderDetailClient code={decodeURIComponent(code)} operatorStatus={operatorStatus} />
  );
}
