// Descuento por cantidad de orígenes en una cotización multi-vendedor.
// Fórmula lineal acordada en ADR-005: 5% por cada origen adicional al primero,
// con tope de 20%. discount(1)=0, discount(2)=0.05, ..., discount(5)=0.20.

const DISCOUNT_STEP = 0.05;
const DISCOUNT_CAP = 0.2;

export function multiOriginDiscountFactor(originsCount: number): number {
  if (originsCount <= 1) return 0;
  return Math.min(DISCOUNT_CAP, DISCOUNT_STEP * (originsCount - 1));
}
