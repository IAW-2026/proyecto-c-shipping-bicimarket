"use client";
import { useQuery } from "@tanstack/react-query";
import { listOperators } from "@/services/api/logistics-operators";

export function useLogisticsOperators(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ["logistics-operators", page, perPage],
    queryFn: () => listOperators(page, perPage),
    staleTime: 5 * 60 * 1000, // operadores cambian poco
  });
}
