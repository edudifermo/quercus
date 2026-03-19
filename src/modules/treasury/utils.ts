import { Prisma, SupplierDocumentStatus, TreasuryMovementDirection } from "@prisma/client";
import { toNumber as toBaseNumber } from "@/modules/production/utils";

export function toNumber(value: unknown) {
  return toBaseNumber(value);
}

export function decimalAmount(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

export function decimalRate(value: number) {
  return new Prisma.Decimal(value.toFixed(6));
}

export function formatMoney(value: unknown, currency: string = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function signByDirection(direction: TreasuryMovementDirection, amount: number) {
  return direction === "IN" ? amount : amount * -1;
}

export function supplierInvoiceStatus(openAmount: number, totalAmount: number): SupplierDocumentStatus {
  if (openAmount <= 0) {
    return "PAID";
  }

  if (openAmount < totalAmount) {
    return "PARTIAL";
  }

  return "OPEN";
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}
