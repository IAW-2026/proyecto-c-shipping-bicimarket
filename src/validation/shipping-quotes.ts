import { z } from "zod";

// POST /api/v1/shipping-quotes (S2S Buyer, docs/03 §SH1).

export const createQuoteSchema = z.object({
  from: z.object({
    seller_profile_id: z.string().min(1),
  }),
  to: z.object({
    city: z.string().min(1),
    province: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(2).max(2),
  }),
  packages: z
    .array(
      z.object({
        weight_grams: z.number().int().positive(),
        length_cm: z.number().int().positive(),
        width_cm: z.number().int().positive(),
        height_cm: z.number().int().positive(),
      }),
    )
    .min(1),
  service_level: z.enum(["standard", "express", "same_day"]),
});
