"use client";
import { useQuery } from "@tanstack/react-query";
import { listShippingRates } from "@/services/api/shipping-rates";

export function useShippingRates() {
  return useQuery({
    queryKey: ["shipping-rates"],
    queryFn: listShippingRates,
    staleTime: 60 * 1000,
  });
}
