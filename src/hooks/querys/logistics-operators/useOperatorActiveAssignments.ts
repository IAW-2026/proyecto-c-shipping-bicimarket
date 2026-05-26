"use client";
import { useQuery } from "@tanstack/react-query";
import { getOperatorActiveAssignments } from "@/services/api/logistics-operators";

export function useOperatorActiveAssignments(operatorId?: string) {
  return useQuery({
    queryKey: ["logistics-operators", operatorId, "active-assignments"],
    queryFn: () => {
      if (!operatorId) throw new Error("operatorId requerido");
      return getOperatorActiveAssignments(operatorId);
    },
    enabled: !!operatorId,
    staleTime: 60 * 1000,
  });
}
