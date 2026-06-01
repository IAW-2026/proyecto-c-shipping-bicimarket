// Service del dominio "products" (catálogo de la Seller App, vía proxy nuestro).
// Una función por endpoint. Sin try/catch — el error propaga al hook.

import { api } from "@/lib/axios";
import type { FeaturedProductsResponse, ProductDTO } from "@/types/products";

export async function getFeaturedProducts(): Promise<ProductDTO[]> {
  const res = await api.get<FeaturedProductsResponse>("/v1/seller-products");
  return res.data.data;
}
