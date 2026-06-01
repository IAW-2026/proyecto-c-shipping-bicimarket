// GET /api/v1/admin/parties — DEV-ONLY (JWT admin)
//
// Devuelve los vendedores y compradores que YA existen en la app, derivados de
// los snapshots guardados en la DB. Alimenta los selects del form de "nuevo
// pedido" (/admin/shipments/new): así solo se pueden crear pedidos con
// vendedores/compradores y direcciones que ya están en el sistema (no se puede
// inventar un seller/buyer ni una ciudad/provincia que no matchee el CP).
//
// En sprint 1 no hay catálogo real de Seller/Buyer (son refs opacas); en sprint
// 2 esto vendría de Seller/Buyer App vía S2S.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import type { Address } from "@/types/common";
import type { AdminPartiesDTO, PartyDTO } from "@/types/admin-parties";

// Los snapshots se guardan como JSON con la forma Address (+ receiver_name en
// el de destino). Normalizamos defensivamente a Address.
function toAddress(snapshot: unknown): Address {
  const s = (snapshot ?? {}) as Record<string, unknown>;
  return {
    street: String(s.street ?? ""),
    number: String(s.number ?? ""),
    apartment: s.apartment ? String(s.apartment) : undefined,
    city: String(s.city ?? ""),
    province: String(s.province ?? ""),
    postal_code: String(s.postal_code ?? ""),
    country: String(s.country ?? "AR"),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    // distinct + orderBy desc → snapshot más reciente por cada vendedor/comprador.
    const sellerRows = await prisma.shipment.findMany({
      distinct: ["sellerProfileId"],
      orderBy: { createdAt: "desc" },
      select: { sellerProfileId: true, pickupAddressSnapshot: true },
    });

    const buyerRows = await prisma.shipmentGroup.findMany({
      distinct: ["buyerProfileId"],
      orderBy: { createdAt: "desc" },
      select: { buyerProfileId: true, shippingAddressSnapshot: true },
    });

    const sellers: PartyDTO[] = sellerRows
      .map((r) => {
        const address = toAddress(r.pickupAddressSnapshot);
        const place = address.city || address.postal_code || r.sellerProfileId;
        return {
          id: r.sellerProfileId,
          label: `${place} (${r.sellerProfileId})`,
          address,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const buyers: PartyDTO[] = buyerRows
      .map((r) => {
        const snapshot = (r.shippingAddressSnapshot ?? {}) as Record<
          string,
          unknown
        >;
        const name = snapshot.receiver_name
          ? String(snapshot.receiver_name)
          : undefined;
        const address = toAddress(snapshot);
        return {
          id: r.buyerProfileId,
          name,
          label: name ? `${name} (${r.buyerProfileId})` : r.buyerProfileId,
          address,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const response: AdminPartiesDTO = { sellers, buyers };
    return NextResponse.json(response);
  } catch (err) {
    return handleApiError(err);
  }
}
