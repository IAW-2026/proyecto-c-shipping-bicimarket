// Productos de la Seller App, consumidos por el carrusel "Seguir comprando".
// `XApi` = shape crudo que devuelve Seller; `ProductDTO` = lo que sirve nuestro
// route handler al frontend.

export interface SellerProductApi {
  id: string;
  seller_profile_id: string;
  seller_display_name?: string | null;
  title: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  price_cents: number;
  currency: string;
  main_image_url?: string | null;
  created_at?: string;
}

export interface ProductDTO {
  id: string;
  seller_profile_id: string;
  seller_name: string | null;
  title: string;
  brand: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  /** Link a la Seller App para "seguir comprando". */
  url: string;
}

export interface FeaturedProductsResponse {
  data: ProductDTO[];
}
