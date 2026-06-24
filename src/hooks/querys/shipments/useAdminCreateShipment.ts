"use client";
import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { createAdminShipment } from "@/services/api/shipments";
import type { CreateAdminShipmentBody } from "@/types/admin-shipments";

/**
 * Mutation dev-only para crear pedidos multi-origen desde /admin/shipments/new.
 * Crea N shipments (uno por origen) compartiendo un único order_id. Invalida la
 * lista admin + my-assignments (los nuevos shipments arrancan como
 * "Disponibles" para cualquier operador).
 */
export function useAdminCreateShipment() {
  return useApiMutation({
    mutationFn: (body: CreateAdminShipmentBody) => createAdminShipment(body),
    invalidateKeys: [
      ["shipments", "admin"],
      ["shipments", "kpis"],
      ["my-assignments"],
    ],
    successMessage: "Pedido creado",
  });
}
