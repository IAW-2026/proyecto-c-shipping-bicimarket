import type { Address } from "@/types/common";

// Mocks de datos que en sprint 2 vendrán de otras apps del marketplace via
// callServiceApi. Por ADR-002, en sprint 1 (app standalone) consumimos
// estos mocks en su lugar.
//
// Reemplazo en sprint 2: cada función acá se convierte en una llamada
// vía src/lib/service-auth.ts:callServiceApi + adapter desde XApi → DTO.

const DEFAULT_PICKUP_ADDRESS: Address = {
  street: "Av. Rivadavia",
  number: "9000",
  city: "Caballito",
  province: "Buenos Aires",
  postal_code: "C1406",
  country: "AR",
};

/**
 * Mock de GET /api/v1/seller-profile/{id}/pickup-address (Seller App).
 * Para sprint 1 devuelve la misma dirección para cualquier seller —
 * suficiente para cotizar y crear shipments end-to-end localmente.
 *
 * Si necesitás direcciones distintas por seller para testing, sumá un
 * switch acá.
 */
export function getMockPickupAddress(_sellerProfileId: string): Address {
  return DEFAULT_PICKUP_ADDRESS;
}
