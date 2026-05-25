// Body de POST /api/v1/internal/shipment-delivered de Payments App (docs/03 §CR4).
// Sprint 1 se loguea como outbound-deferred; sprint 2 se llama con callServiceApi.

export interface PaymentsShipmentDeliveredBody {
  shipment_id: string;
  order_id: string;
  order_seller_group_id: string;
  sales_order_id: string;
  seller_profile_id: string;
  delivered_at: string;
}

export interface PaymentsShipmentDeliveredResponse {
  received: true;
  settlement_id: string;
}

// Body que Shipping ENVÍA a Seller en PATCH /api/v1/sales-orders/{id}/shipping-status
// (docs/03 §CR3). Vive acá porque es shape de envío a Seller — distinto de los
// DTOs de respuesta de Seller (esos estarían en seller.ts si los necesitáramos).
export interface SellerSalesOrderShippingStatusPatchBody {
  shipping_status:
    | "ready_for_pickup"
    | "picked_up"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failed_delivery"
    | "returned";
  shipment_id: string;
  occurred_at: string;
}
