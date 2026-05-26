"use client";
import { useQuery } from "@tanstack/react-query";
import { getShipmentsKpis } from "@/services/api/shipments";

export function useShipmentsKpis() {
  return useQuery({
    queryKey: ["shipments", "kpis"],
    queryFn: getShipmentsKpis,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
