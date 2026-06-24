// KPIs para los dashboards admin. Cada DTO representa los counts que se
// muestran en la fila de KpiCards arriba de cada tabla.

export interface ShipmentsKpisDTO {
  active: number; // ready_for_pickup + picked_up + in_transit + out_for_delivery
  delivered_today: number;
  failed_30d: number; // failed_delivery en los últimos 30 días
  returned_30d: number;
  /** Deltas vs período anterior — ya calculados para no hacer cuentas en UI. */
  delta_active: number;
  delta_delivered_today: number;
  delta_failed_30d: number;
  delta_returned_30d: number;
  /** Sparkline opcional: 7 puntos del período. */
  sparkline_active?: number[];
  sparkline_delivered?: number[];
}

export interface OperatorsKpisDTO {
  active: number;
  suspended: number;
  active_assignments: number;
  avg_deliveries_30d: number;
  delta_active_assignments?: number;
}
