"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { createOperator } from "@/services/api/logistics-operators";
import type { CreateLogisticsOperatorBody } from "@/types/logistics-operators";

export function useLogisticsOperatorMutations() {
  const operatorsKey = ["logistics-operators"];

  return {
    createOperator: useApiMutation({
      mutationFn: (data: CreateLogisticsOperatorBody) => createOperator(data),
      invalidateKeys: [operatorsKey],
      successMessage: "Operador creado correctamente",
    }),
  };
}
