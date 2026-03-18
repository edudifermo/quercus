export function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function formatQty(value: unknown, digits = 3) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toNumber(value));
}

export function formatCost(value: unknown) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function calcShortage(theoretical: number, available: number) {
  return Math.max(theoretical - available, 0);
}

export function calcRequirement(theoreticalPerBase: number, plannedQty: number, baseQty: number, scrapRate: number) {
  if (baseQty === 0) {
    return 0;
  }

  const gross = (theoreticalPerBase * plannedQty) / baseQty;
  return gross * (1 + scrapRate);
}
