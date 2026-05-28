/**
 * Prueba de entrega — fila de `delivery_proofs`. Una por shipment cuando
 * el operador confirma la entrega. Devuelta por GET /api/v1/shipments/{id}/delivery-proof.
 */
export interface DeliveryProofDTO {
  id: string;
  shipment_id: string;
  proof_photo_url: string | null;
  signature_image_url: string | null;
  note: string | null;
  delivered_at: string;
  created_at: string;
}
