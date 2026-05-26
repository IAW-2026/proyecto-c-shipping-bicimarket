import type { FilterConfig } from "@/types/filters";

export const filterConfigsOperators: FilterConfig[] = [
  {
    columnId: "q",
    type: "input",
    placeholder: "Nombre, email o DNI",
    isPrincipal: true,
    isCompact: true,
  },
  {
    columnId: "status",
    type: "multi-select",
    placeholder: "Estado",
    customOptions: ["active", "inactive", "suspended"],
  },
  {
    columnId: "vehicle_type",
    type: "multi-select",
    placeholder: "Vehículo",
    customOptions: ["motorcycle", "car", "van", "truck"],
  },
];
