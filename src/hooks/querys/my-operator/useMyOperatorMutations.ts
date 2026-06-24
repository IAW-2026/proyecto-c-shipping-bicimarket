"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import {
  patchMyOperator,
  type UpdateMyOperatorBody,
} from "@/services/api/my-operator";

export function useMyOperatorMutations() {
  return {
    patchMyOperator: useApiMutation({
      mutationFn: (data: UpdateMyOperatorBody) => patchMyOperator(data),
      invalidateKeys: [["my-operator"]],
      successMessage: "Datos actualizados",
    }),
  };
}
