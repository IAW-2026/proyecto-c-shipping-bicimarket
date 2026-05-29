// ADR-006: rollup persistido del estado del pedido (ShipmentGroup.status).
//
// El estado del grupo no se recalcula en memoria en cada lectura: se persiste
// y se recomputa dentro de la misma $transaction que cambia el estado de
// cualquiera de sus shipments (tracking-events, deliver, creación). Reusa la
// lógica pura de rollupShipmentStatus (src/lib/shipment-rollup.ts).

import type { Prisma } from "@/generated/prisma/client";
import type { ShipmentStatus } from "@/types/shipments";
import { rollupShipmentStatus } from "@/lib/shipment-rollup";

/**
 * Recalcula y persiste ShipmentGroup.status a partir de los estados actuales
 * de sus shipments. Debe llamarse DENTRO de la transacción que ya aplicó el
 * cambio de estado del shipment, para que el findMany vea el estado nuevo.
 *
 * Devuelve el estado consolidado resultante.
 */
export async function recomputeGroupStatus(
  tx: Prisma.TransactionClient,
  shipmentGroupId: string,
): Promise<ShipmentStatus> {
  const siblings = await tx.shipment.findMany({
    where: { shipmentGroupId },
    select: { status: true },
  });
  const rolled = rollupShipmentStatus(
    siblings.map((s) => s.status as ShipmentStatus),
  );
  await tx.shipmentGroup.update({
    where: { id: shipmentGroupId },
    data: { status: rolled },
  });
  return rolled;
}
