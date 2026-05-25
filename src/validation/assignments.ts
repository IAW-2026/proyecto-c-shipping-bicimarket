import { z } from "zod";

// POST /api/v1/shipments/{id}/assignments (admin, docs/03 §SH5).
export const createAssignmentSchema = z.object({
  operator_clerk_user_id: z.string().min(1),
});

// PATCH /api/v1/shipments/{id}/assignments/{aid} (admin reassign).
// Al menos uno de los dos campos debe estar presente.
export const patchAssignmentSchema = z
  .object({
    status: z
      .enum([
        "assigned",
        "accepted",
        "picked_up",
        "delivered",
        "reassigned",
        "cancelled",
      ])
      .optional(),
    operator_clerk_user_id: z.string().min(1).optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.operator_clerk_user_id !== undefined,
    { message: "Debe enviarse al menos status o operator_clerk_user_id" },
  );
