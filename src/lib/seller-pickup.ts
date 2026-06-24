import { adaptPickupAddressApi } from "@/adapters/seller";
import { ApiError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import { callServiceApi } from "@/lib/service-auth";
import type { SellerPickupAddressApi } from "@/types/external/seller";

export async function fetchSellerPickupAddress(
  sellerProfileId: string,
  requestId: string,
) {
  logger.info({
    msg: "seller-pickup.fetch.start",
    requestId,
    seller_profile_id: sellerProfileId,
    target: "seller",
  });

  let res: Response;
  try {
    res = await callServiceApi(
      "seller",
      `/api/v1/seller-profile/${sellerProfileId}/pickup-address`,
    );
  } catch (err) {
    logger.error({
      msg: "seller-pickup.fetch.exception",
      requestId,
      seller_profile_id: sellerProfileId,
      target: "seller",
      cause: String(err),
    });
    throw new ApiError(
      "UPSTREAM_ERROR",
      502,
      "No pudimos obtener la direccion de retiro del vendedor",
      {
        seller_profile_id: sellerProfileId,
        target: "seller",
        cause: String(err),
      },
    );
  }

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new ApiError(
      res.status === 404 ? "SELLER_PICKUP_ADDRESS_NOT_FOUND" : "UPSTREAM_ERROR",
      res.status === 404 ? 422 : 502,
      "No pudimos resolver la direccion de retiro del vendedor",
      {
        seller_profile_id: sellerProfileId,
        target: "seller",
        upstream_status: res.status,
        upstream_body: details,
      },
    );
  }

  const raw = (await res.json()) as SellerPickupAddressApi;
  return adaptPickupAddressApi(raw);
}
