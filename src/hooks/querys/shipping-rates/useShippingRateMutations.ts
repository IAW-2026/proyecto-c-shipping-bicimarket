"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import {
  createShippingRate,
  deleteShippingRate,
  patchShippingRate,
} from "@/services/api/shipping-rates";
import type {
  CreateShippingRateBody,
  UpdateShippingRateBody,
} from "@/types/shipping-rates";

/**
 * Mutations agrupadas del dominio shipping-rates. Las 3 acciones (create,
 * patch, delete) viven juntas porque las consume la misma pantalla
 * /admin/rates.
 */
export function useShippingRateMutations() {
  const ratesKey = ["shipping-rates"];

  return {
    createRate: useApiMutation({
      mutationFn: (data: CreateShippingRateBody) => createShippingRate(data),
      invalidateKeys: [ratesKey],
      successMessage: "Tarifa creada",
    }),

    patchRate: useApiMutation({
      mutationFn: (vars: { rateId: string; data: UpdateShippingRateBody }) =>
        patchShippingRate(vars.rateId, vars.data),
      invalidateKeys: [ratesKey],
      successMessage: "Tarifa actualizada",
    }),

    deleteRate: useApiMutation({
      mutationFn: (rateId: string) => deleteShippingRate(rateId),
      invalidateKeys: [ratesKey],
      successMessage: "Tarifa eliminada",
    }),
  };
}
