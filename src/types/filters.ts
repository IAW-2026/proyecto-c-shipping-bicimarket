// Config declarativa de filtros para tablas. Patrón documentado en
// docs/09-tablas-server-side.md.
//
// Server-side: columnId = nombre del query param que entiende la API.
// Client-side: columnId = accessorKey de la columna TanStack Table.

export type FilterType =
  | "input"
  | "select"
  | "multi-select"
  | "date-range"
  | "range";

export interface FilterConfig {
  /** Server-side: query param. Client-side: accessorKey. */
  columnId: string;
  type: FilterType;
  placeholder: string;
  /** true = se muestra inline siempre visible (fuera del popover "más filtros") */
  isPrincipal?: boolean;
  /** true = versión compacta del input */
  isCompact?: boolean;
  /** Opciones hardcodeadas para multi-select sin framework externo */
  customOptions?: string[];
}
