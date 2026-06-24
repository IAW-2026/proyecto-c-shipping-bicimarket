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

interface ShipmentNotificationOptions {
  notifySeller?: boolean;
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

function logOutboundResult(
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
    return;
  }

  logger.info({
    msg: "shipment-status-patch-succeeded",
    target,
    method,
    path,
    shipmentId,
    shippingStatus: (payload as { shipping_status?: string }).shipping_status,
    upstreamStatus: result.value.status,
  });
}

/**
 * Propaga el espejo del estado a Buyer y Seller sin convertir un fallo
 * externo en fallo de la transición local. callServiceApi ya aplica los
 * tres reintentos normativos; después de agotarlos dejamos un log
 * outbound-failed para replay manual/job.
 */
export async function notifyShipmentStatus(
  context: ShipmentNotificationContext,
  options: ShipmentNotificationOptions = {},
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
    occurred_at: context.occurredAt,
  };
  const sellerBody: SellerSalesOrderShippingStatusPatchBody = {
    shipping_status: context.shipmentStatus,
    shipment_id: context.shipmentId,
    occurred_at: context.occurredAt,
  };

  // Confirma el PATCH exacto que se enviara a Buyer para persistir el
  // shipment individual y el tracking global BMK del pedido.
  logger.info({
    msg: "shipment-status-patch-prepared",
    target: "buyer",
    method: "PATCH",
    path: buyerPath,
    shipmentId: context.shipmentId,
    orderId: context.orderId,
    orderSellerGroupId: context.orderSellerGroupId,
    payload: buyerBody,
  });

  const calls = [
    callServiceApi("buyer", buyerPath, {
      method: "PATCH",
      body: buyerBody,
    }),
  ];
  if (options.notifySeller !== false) {
    logger.info({
      msg: "shipment-status-patch-prepared",
      target: "seller",
      method: "PATCH",
      path: sellerPath,
      shipmentId: context.shipmentId,
      salesOrderId: context.salesOrderId,
      payload: sellerBody,
    });
    calls.push(callServiceApi("seller", sellerPath, {
      method: "PATCH",
      body: sellerBody,
    }));
  }

  const [buyerResult, sellerResult] = await Promise.allSettled(calls);

  logOutboundResult(
    "buyer",
    "PATCH",
    buyerPath,
    buyerBody,
    context.shipmentId,
    buyerResult,
  );
  if (!sellerResult) return;

  logOutboundResult(
    "seller",
    "PATCH",
    sellerPath,
    sellerBody,
    context.shipmentId,
    sellerResult,
  );
}
