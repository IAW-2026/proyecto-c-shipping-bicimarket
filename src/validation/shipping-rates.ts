import { z } from "zod";

const serviceLevelEnum = z.enum(["standard", "express", "same_day"]);

export const createShippingRateSchema = z
  .object({
    carrier: z.string().min(1, "Carrier requerido"),
    service_level: serviceLevelEnum,
    distance_km_min: z.number().int().min(0),
    distance_km_max: z.number().int().min(1),
    weight_grams_min: z.number().int().min(0),
    weight_grams_max: z.number().int().min(1),
    cost_cents: z.number().int().min(0),
    estimated_days_min: z.number().int().min(0),
    estimated_days_max: z.number().int().min(0),
    active: z.boolean().optional(),
  })
  .refine((d) => d.distance_km_max > d.distance_km_min, {
    message: "distance_km_max debe ser mayor a distance_km_min",
    path: ["distance_km_max"],
  })
  .refine((d) => d.weight_grams_max > d.weight_grams_min, {
    message: "weight_grams_max debe ser mayor a weight_grams_min",
    path: ["weight_grams_max"],
  })
  .refine((d) => d.estimated_days_max >= d.estimated_days_min, {
    message: "estimated_days_max debe ser >= estimated_days_min",
    path: ["estimated_days_max"],
  });

export const updateShippingRateSchema = z.object({
  carrier: z.string().min(1).optional(),
  service_level: serviceLevelEnum.optional(),
  distance_km_min: z.number().int().min(0).optional(),
  distance_km_max: z.number().int().min(1).optional(),
  weight_grams_min: z.number().int().min(0).optional(),
  weight_grams_max: z.number().int().min(1).optional(),
  cost_cents: z.number().int().min(0).optional(),
  estimated_days_min: z.number().int().min(0).optional(),
  estimated_days_max: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});
