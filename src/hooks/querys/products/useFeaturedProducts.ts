"use client";
import { useQuery } from "@tanstack/react-query";
import { getFeaturedProducts } from "@/services/api/products";

/**
 * Primeros productos de la Seller App para el carrusel "Seguir comprando".
 * `retry: false` para que, si la Seller App no responde, no reintente y el
 * carrusel quede oculto sin ruido.
 */
export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["seller-products", "featured"],
    queryFn: getFeaturedProducts,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
