"use client";
import { useQuery } from "@tanstack/react-query";
import { getOperatorsKpis } from "@/services/api/logistics-operators";

export function useOperatorsKpis() {
  return useQuery({
    queryKey: ["logistics-operators", "kpis"],
    queryFn: getOperatorsKpis,
    // Mismos 30s que la tabla — KPIs y filas se mantienen en sync.
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
