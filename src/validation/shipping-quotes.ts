import { z } from "zod";

// POST /api/v1/shipping-quotes (S2S Buyer, docs/03 §SH1).
// Desde ADR-005: el endpoint acepta siempre pickups[] (N>=1). Single-origen
// es el caso pickups.length === 1 sin descuento; multi-vendedor aplica la
// fórmula multiOriginDiscountFactor.

const packageDimensionsSchema = z.object({
  weight_grams: z.number().int().positive(),
  length_cm: z.number().int().positive(),
  width_cm: z.number().int().positive(),
  height_cm: z.number().int().positive(),
});

export const createQuoteSchema = z.object({
  pickups: z
    .array(
      z.object({
        seller_profile_id: z.string().min(1),
        packages: z.array(packageDimensionsSchema).min(1),
      }),
    )
    .min(1),
  to: z.object({
    city: z.string().min(1),
    province: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(2).max(2),
  }),
  service_level: z.enum(["standard", "express", "same_day"]),
});
