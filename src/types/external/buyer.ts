// Body que Shipping ENVÍA a Buyer en PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping
// (docs/03 §CR2). Sprint 1 no se envía — se loguea como outbound-deferred.

export interface BuyerOrderShippingPatchBody {
  shipping_status:
    | "ready_for_pickup"
    | "picked_up"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failed_delivery"
    | "returned";
  shipment_id: string;
  tracking_number: string;
  occurred_at: string;
}
