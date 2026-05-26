// PATCH  /api/v1/shipping-rates/{rateId} — actualizar (JWT admin)
// DELETE /api/v1/shipping-rates/{rateId} — borrar (JWT admin)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ApiError, handleApiError } from "@/lib/api-error";
import { updateShippingRateSchema } from "@/validation/shipping-rates";
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ rateId: string }> },
) {
  try {
    const { rateId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    const body = updateShippingRateSchema.parse(await req.json());

    const updated = await prisma.shippingRate.update({
      where: { id: rateId },
      data: {
        ...(body.carrier !== undefined && { carrier: body.carrier }),
        ...(body.service_level !== undefined && {
          serviceLevel: body.service_level,
        }),
        ...(body.distance_km_min !== undefined && {
          distanceKmMin: body.distance_km_min,
        }),
        ...(body.distance_km_max !== undefined && {
          distanceKmMax: body.distance_km_max,
        }),
        ...(body.weight_grams_min !== undefined && {
          weightGramsMin: body.weight_grams_min,
        }),
        ...(body.weight_grams_max !== undefined && {
          weightGramsMax: body.weight_grams_max,
        }),
        ...(body.cost_cents !== undefined && { costCents: body.cost_cents }),
        ...(body.estimated_days_min !== undefined && {
          estimatedDaysMin: body.estimated_days_min,
        }),
        ...(body.estimated_days_max !== undefined && {
          estimatedDaysMax: body.estimated_days_max,
        }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });

    return NextResponse.json(toDTO(updated));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ rateId: string }> },
) {
  try {
    const { rateId } = await params;

    const { userId, sessionClaims } = await auth();
    if (!userId || !(await requireAdmin(sessionClaims))) {
      throw new ApiError("FORBIDDEN", 403, "Admin requerido");
    }

    await prisma.shippingRate.delete({ where: { id: rateId } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
