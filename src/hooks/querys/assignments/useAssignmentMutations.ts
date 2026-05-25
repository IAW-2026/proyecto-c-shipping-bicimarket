"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import {
  createAssignment,
  patchAssignment,
} from "@/services/api/assignments";
import type {
  CreateAssignmentBody,
  PatchAssignmentBody,
} from "@/types/assignments";

/**
 * Mutations admin del dominio "assignments". Reciben shipmentId como contexto;
 * el assignmentId se pasa en variables cuando aplica (patchAssignment).
 */
export function useAssignmentMutations(shipmentId: string) {
  const shipmentKey = ["shipments", shipmentId];
  const adminListKey = ["shipments", "admin"];
  const operatorsKey = ["logistics-operators"];

  return {
    createAssignment: useApiMutation({
      mutationFn: (data: CreateAssignmentBody) =>
        createAssignment(shipmentId, data),
      invalidateKeys: [shipmentKey, adminListKey, ["my-assignments"]],
      successMessage: "Envío asignado al operador",
    }),

    patchAssignment: useApiMutation({
      mutationFn: (vars: { assignmentId: string; data: PatchAssignmentBody }) =>
        patchAssignment(shipmentId, vars.assignmentId, vars.data),
      invalidateKeys: [shipmentKey, adminListKey, operatorsKey, ["my-assignments"]],
      successMessage: "Asignación actualizada",
    }),
  };
}
