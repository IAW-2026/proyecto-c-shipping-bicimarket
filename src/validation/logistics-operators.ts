import { z } from "zod";

// POST /api/v1/logistics-operators (admin, docs/03 §SH5).
export const createLogisticsOperatorSchema = z.object({
  clerk_user_id: z.string().min(1),
  full_name: z.string().min(1),
  email: z.email(),
  phone: z.string().min(1),
  document_id: z.string().min(1),
  vehicle_type: z.enum(["motorcycle", "car", "van", "truck"]),
  license_plate: z.string().min(1),
});
