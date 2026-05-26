"use client";
import { useQuery } from "@tanstack/react-query";
import { getOperatorsKpis } from "@/services/api/logistics-operators";

export function useOperatorsKpis() {
  return useQuery({
    queryKey: ["logistics-operators", "kpis"],
    queryFn: getOperatorsKpis,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
