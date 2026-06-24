"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { patchShipmentStatus } from "@/services/api/shipments";
import {
  createAssignment,
  patchAssignment,
} from "@/services/api/assignments";
import type { PatchShipmentStatusBody } from "@/types/shipments";
import type {
  CreateAssignmentBody,
  PatchAssignmentBody,
} from "@/types/assignments";

/**
 * Mutations admin del detalle de envío. Agrupa override de status +
 * asignación/reasignación de operador. El componente desestructura solo lo
 * que necesita.
 */
export function useShipmentAdminMutations(shipmentId: string) {
  const shipmentKey = ["shipments", shipmentId];
  const adminListKey = ["shipments", "admin"];
  const operatorsKey = ["logistics-operators"];

  return {
    overrideStatus: useApiMutation({
      mutationFn: (data: PatchShipmentStatusBody) =>
        patchShipmentStatus(shipmentId, data),
      invalidateKeys: [
        shipmentKey,
        adminListKey,
        ["my-assignments"],
        ["shipments", shipmentId, "status-history"],
      ],
      successMessage: "Estado del envío actualizado",
    }),

    assignOperator: useApiMutation({
      mutationFn: (data: CreateAssignmentBody) =>
        createAssignment(shipmentId, data),
      invalidateKeys: [shipmentKey, adminListKey, operatorsKey, ["my-assignments"]],
      successMessage: "Operador asignado al envío",
    }),

    reassignOperator: useApiMutation({
      mutationFn: (vars: { assignmentId: string; data: PatchAssignmentBody }) =>
        patchAssignment(shipmentId, vars.assignmentId, vars.data),
      invalidateKeys: [shipmentKey, adminListKey, operatorsKey, ["my-assignments"]],
      successMessage: "Reasignación completada",
    }),
  };
}
