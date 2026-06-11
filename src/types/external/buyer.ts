// Body que Shipping ENVÍA a Buyer en PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping
// (docs/03 §CR2). Se envia despues de confirmar la transicion local.

export interface BuyerOrderShippingPatchBody {
  status: "ready_to_ship" | "in_transit" | "delivered";
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
