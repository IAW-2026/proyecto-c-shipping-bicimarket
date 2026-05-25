// Contratos de la API de Seller App. Solo se usan en sprint 2, dentro de
// adapters (src/adapters/seller.ts) cuando un route handler nuestro proxea a
// Seller con callServiceApi. Sufijo "Api" → shape crudo de API externa.
//
// Sprint 1: estos tipos quedan definidos pero NO se importan en runtime.

export interface SellerPickupAddressApi {
  seller_profile_id: string;
  pickup_address: {
    street: string;
    number: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
  };
}
