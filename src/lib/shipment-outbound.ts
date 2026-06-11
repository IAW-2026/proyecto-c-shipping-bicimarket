import { ShipmentStatus } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import { callServiceApi } from "@/lib/service-auth";
import type { BuyerOrderShippingPatchBody } from "@/types/external/buyer";
import type { SellerSalesOrderShippingStatusPatchBody } from "@/types/external/payments";

type NotifiableShipmentStatus =
  SellerSalesOrderShippingStatusPatchBody["shipping_status"];

interface ShipmentNotificationContext {
  shipmentId: string;
  shipmentStatus: NotifiableShipmentStatus;
  orderId: string;
  orderSellerGroupId: string;
  salesOrderId: string;
  orderTrackingNumber: string;
  trackingUrl?: string;
  occurredAt: string;
}

function mapBuyerGroupStatus(
  status: NotifiableShipmentStatus,
): BuyerOrderShippingPatchBody["status"] {
  switch (status) {
    case ShipmentStatus.ready_for_pickup:
      return "ready_to_ship";
    case ShipmentStatus.picked_up:
      return "in_transit";
    case ShipmentStatus.delivered:
      return "delivered";
    default:
      return "in_transit";
  }
}

function logRejectedOutbound(
  target: "buyer" | "seller",
  method: "PATCH",
  path: string,
  payload: unknown,
  shipmentId: string,
  result: PromiseSettledResult<Response>,
) {
  if (result.status === "rejected") {
    logger.outboundFailed({
      target,
      method,
      path,
      payload,
      shipmentId,
      cause: String(result.reason),
    });
    return;
  }

  if (!result.value.ok) {
    logger.outboundFailed({
      target,
      method,
      path,
      payload,
      shipmentId,
      upstreamStatus: result.value.status,
    });
  }
}

/**
 * Propaga el espejo del estado a Buyer y Seller sin convertir un fallo
 * externo en fallo de la transición local. callServiceApi ya aplica los
 * tres reintentos normativos; después de agotarlos dejamos un log
 * outbound-failed para replay manual/job.
 */
export async function notifyShipmentStatus(
  context: ShipmentNotificationContext,
): Promise<void> {
  const buyerPath =
    `/api/v1/orders/${context.orderId}` +
    `/seller-groups/${context.orderSellerGroupId}/shipping`;
  const sellerPath =
    `/api/v1/sales-orders/${context.salesOrderId}/shipping-status`;

  const buyerBody: BuyerOrderShippingPatchBody = {
    status: mapBuyerGroupStatus(context.shipmentStatus),
    shipping_status: context.shipmentStatus,
    shipment_id: context.shipmentId,
    tracking_number: context.orderTrackingNumber,
    ...(context.trackingUrl ? { tracking_url: context.trackingUrl } : {}),
  };
  const sellerBody: SellerSalesOrderShippingStatusPatchBody = {
    shipping_status: context.shipmentStatus,
    shipment_id: context.shipmentId,
    occurred_at: context.occurredAt,
  };

  const [buyerResult, sellerResult] = await Promise.allSettled([
    callServiceApi("buyer", buyerPath, {
      method: "PATCH",
      body: buyerBody,
    }),
    callServiceApi("seller", sellerPath, {
      method: "PATCH",
      body: sellerBody,
    }),
  ]);

  logRejectedOutbound(
    "buyer",
    "PATCH",
    buyerPath,
    buyerBody,
    context.shipmentId,
    buyerResult,
  );
  logRejectedOutbound(
    "seller",
    "PATCH",
    sellerPath,
    sellerBody,
    context.shipmentId,
    sellerResult,
  );
}
