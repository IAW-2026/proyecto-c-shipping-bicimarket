import type { Address } from "@/types/common";
import type { SellerPickupAddressApi } from "@/types/external/seller";

export function adaptPickupAddressApi(raw: SellerPickupAddressApi): Address {
  return {
    street: raw.pickup_address.street,
    number: raw.pickup_address.number,
    city: raw.pickup_address.city,
    province: raw.pickup_address.province,
    postal_code: raw.pickup_address.postal_code,
    country: raw.pickup_address.country,
  };
}
