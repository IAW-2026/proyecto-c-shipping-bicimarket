"use client";
import { useQuery } from "@tanstack/react-query";
import { getOperatorPerformance } from "@/services/api/logistics-operators";

export function useOperatorPerformance(operatorId?: string) {
  return useQuery({
    queryKey: ["logistics-operators", operatorId, "performance"],
    queryFn: () => {
      if (!operatorId) throw new Error("operatorId requerido");
      return getOperatorPerformance(operatorId);
    },
    enabled: !!operatorId,
    staleTime: 5 * 60 * 1000,
  });
}
