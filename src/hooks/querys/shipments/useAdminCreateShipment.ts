"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { createAdminShipment } from "@/services/api/shipments";
import type { CreateAdminShipmentBody } from "@/types/admin-shipments";

/**
 * Mutation dev-only para crear envíos manualmente desde /admin/shipments/new.
 * Invalida la lista admin + my-assignments (porque el nuevo envío arranca
 * como "Disponible" para cualquier operador).
 */
export function useAdminCreateShipment() {
  return useApiMutation({
    mutationFn: (body: CreateAdminShipmentBody) => createAdminShipment(body),
    invalidateKeys: [
      ["shipments", "admin"],
      ["shipments", "kpis"],
      ["my-assignments"],
    ],
    successMessage: "Envío creado",
  });
}
