// GET  /api/v1/shipping-rates — lista completa (JWT admin)
// POST /api/v1/shipping-rates — crea una tarifa (JWT admin)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateId } from "@/lib/ids";
import { ApiError, handleApiError } from "@/lib/api-error";
import { createShippingRateSchema } from "@/validation/shipping-rates";
import type { ShippingRate } from "@/generated/prisma/client";
import type { ServiceLevel } from "@/types/shipments";
import type { ShippingRateDTO } from "@/types/shipping-rates";

function toDTO(r: ShippingRate): ShippingRateDTO {
  return {
    id: r.id,
    carrier: r.carrier,
    service_level: r.serviceLevel as ServiceLevel,
    distance_km_min: r.distanceKmMin,
    distance_km_max: r.distanceKmMax,
    weight_grams_min: r.weightGramsMin,
    weight_grams_max: r.weightGramsMax,
    cost_cents: r.costCents,
    estimated_days_min: r.estimatedDaysMin,
    estimated_days_max: r.estimatedDaysMax,
    active: r.active,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

export async function GET(_req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const rates = await prisma.shippingRate.findMany({
      orderBy: [
        { active: "desc" },
        { distanceKmMin: "asc" },
        { weightGramsMin: "asc" },
        { serviceLevel: "asc" },
        { carrier: "asc" },
      ],
    });

    return NextResponse.json({ data: rates.map(toDTO) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const body = createShippingRateSchema.parse(await req.json());

    const rate = await prisma.shippingRate.create({
      data: {
        id: generateId("rat"),
        carrier: body.carrier,
        serviceLevel: body.service_level,
        distanceKmMin: body.distance_km_min,
        distanceKmMax: body.distance_km_max,
        weightGramsMin: body.weight_grams_min,
        weightGramsMax: body.weight_grams_max,
        costCents: body.cost_cents,
        estimatedDaysMin: body.estimated_days_min,
        estimatedDaysMax: body.estimated_days_max,
        active: body.active ?? true,
      },
    });

    return NextResponse.json(toDTO(rate), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
