export function effectivePriceCents(
  priceCents: number,
  salePriceCents: number | null | undefined,
): number {
  if (salePriceCents == null) return priceCents;
  if (!Number.isInteger(salePriceCents) || salePriceCents < 0) return priceCents;
  if (salePriceCents >= priceCents) return priceCents;
  return salePriceCents;
}
