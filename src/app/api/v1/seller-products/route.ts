// GET /api/v1/seller-products — PÚBLICO (sin auth)
//
// Proxy al catálogo de la Seller App para el carrusel "Seguir comprando" que se
// muestra en la landing y en el tracking público. Trae los primeros 5 productos
// (sort=-created_at) y los normaliza a ProductDTO.
//
// Llamada S2S saliente: usa SELLER_APP_URL + PAYMENTS_TO_SELLER_SERVICE_TOKEN
// (el único token habilitado hoy entre los equipos). Si la Seller App no
// responde o falta config, devolvemos { data: [] } con 200 para que el carrusel
// simplemente no se muestre (UI sutil, sin romper la página).

import { NextResponse } from "next/server";
import type {
  FeaturedProductsResponse,
  ProductDTO,
  SellerProductApi,
} from "@/types/products";

const LIMIT = 5;

export async function GET() {
  const raw = process.env.SELLER_APP_URL;
  const token = process.env.PAYMENTS_TO_SELLER_SERVICE_TOKEN;
  const empty: FeaturedProductsResponse = { data: [] };

  if (!raw || !token) {
    return NextResponse.json(empty);
  }

  const base = raw.replace(/\/+$/, "");
  const sellerUrl = `${base}/api/v1/products?limit=${LIMIT}&sort=-created_at`;

  try {
    const res = await fetch(sellerUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Service-Token": token,
      },
      // No cacheamos por defecto; el hook de TanStack maneja el staleTime.
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json(empty);

    const json = (await res.json()) as { data?: SellerProductApi[] };
    const items = Array.isArray(json.data) ? json.data.slice(0, LIMIT) : [];

    const data: ProductDTO[] = items.map((p) => ({
      id: p.id,
      seller_profile_id: p.seller_profile_id,
      seller_name: p.seller_display_name ?? null,
      title: p.title,
      brand: p.brand ?? null,
      price_cents: p.price_cents,
      currency: p.currency ?? "ARS",
      image_url: p.main_image_url ?? null,
      url: base,
    }));

    return NextResponse.json({ data } satisfies FeaturedProductsResponse);
  } catch {
    // timeout / red / JSON inválido → carrusel oculto
    return NextResponse.json(empty);
  }
}
