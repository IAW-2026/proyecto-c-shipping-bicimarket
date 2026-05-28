import type { FilterConfig } from "@/types/filters";

// FilterConfig[] para la tabla admin de shipments.
// columnId acá = nombre del query param que entiende el route handler GET
// /api/v1/shipments (no el accessorKey de la columna).

export const filterConfigsShipments: FilterConfig[] = [
  {
    columnId: "tracking_number",
    type: "input",
    placeholder: "Tracking #",
    isPrincipal: true,
    isCompact: true,
  },
  {
    columnId: "status",
    type: "multi-select",
    placeholder: "Estado",
    customOptions: [
      "created",
      "ready_for_pickup",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "failed_delivery",
      "returned",
    ],
  },
  {
    columnId: "seller_profile_id",
    type: "input",
    placeholder: "Seller ID",
  },
  {
    columnId: "order_id",
    type: "input",
    placeholder: "Pedido (ord_…)",
  },
  {
    columnId: "created_at",
    type: "date-range",
    placeholder: "Fecha de creación",
  },
];
