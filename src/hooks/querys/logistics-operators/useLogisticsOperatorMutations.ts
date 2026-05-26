"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import {
  createOperator,
  patchOperator,
  type PatchOperatorBody,
} from "@/services/api/logistics-operators";
import type { CreateLogisticsOperatorBody } from "@/types/logistics-operators";

/**
 * Mutations agrupadas del dominio "logistics-operators". El consumidor
 * desestructura solo las que necesita:
 *
 *   const { createOperator } = useLogisticsOperatorMutations();
 *   const { patchOperator } = useLogisticsOperatorMutations(operatorId);
 */
export function useLogisticsOperatorMutations(operatorId?: string) {
  const operatorsKey = ["logistics-operators"];

  return {
    createOperator: useApiMutation({
      mutationFn: (data: CreateLogisticsOperatorBody) => createOperator(data),
      invalidateKeys: [operatorsKey],
      successMessage: "Operador creado correctamente",
    }),

    patchOperator: useApiMutation({
      mutationFn: (data: PatchOperatorBody) => {
        if (!operatorId) {
          throw new Error("useLogisticsOperatorMutations: operatorId requerido para patchOperator");
        }
        return patchOperator(operatorId, data);
      },
      invalidateKeys: [operatorsKey],
      successMessage: "Operador actualizado",
    }),
  };
}
