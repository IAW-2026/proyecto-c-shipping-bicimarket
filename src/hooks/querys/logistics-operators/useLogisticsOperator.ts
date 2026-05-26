"use client";
import { useQuery } from "@tanstack/react-query";
import { getOperator } from "@/services/api/logistics-operators";

export function useLogisticsOperator(operatorId?: string) {
  return useQuery({
    queryKey: ["logistics-operators", operatorId],
    queryFn: () => {
      if (!operatorId) throw new Error("operatorId requerido");
      return getOperator(operatorId);
    },
    enabled: !!operatorId,
    staleTime: 60 * 1000,
  });
}
