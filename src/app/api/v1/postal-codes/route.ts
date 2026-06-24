// GET /api/v1/postal-codes — PÚBLICO (sin auth)
// Devuelve el dataset hardcoded de CPs argentinos que la app conoce.
// Pensado para que otras apps (Buyer) puedan poblar selectores con la
// misma lista, sin tener que duplicar el dataset.
//
// Filtros opcionales:
//   ?q=mar             → matchea city case-insensitive
//   ?province=Buenos   → matchea province case-insensitive
//
// Sin paginación: la lista es pequeña (~230 entradas, <30KB).

import { NextRequest, NextResponse } from "next/server";
import { AR_POSTAL_CODES } from "@/lib/geo/ar-postal-codes";
import { handleApiError } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase().trim() ?? "";
    const province = searchParams.get("province")?.toLowerCase().trim() ?? "";

    let entries = Object.values(AR_POSTAL_CODES);

    if (q) {
      entries = entries.filter(
        (e) =>
          e.city.toLowerCase().includes(q) ||
          e.cp.toLowerCase().includes(q) ||
          e.province.toLowerCase().includes(q),
      );
    }
    if (province) {
      entries = entries.filter((e) =>
        e.province.toLowerCase().includes(province),
      );
    }

    // Orden: provincia A→Z, después ciudad A→Z
    entries.sort((a, b) => {
      if (a.province !== b.province) {
        return a.province.localeCompare(b.province);
      }
      return a.city.localeCompare(b.city);
    });

    return NextResponse.json({
      data: entries,
      total: entries.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
