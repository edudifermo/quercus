import { FiscalDocumentStatus } from "@prisma/client";
import {
  CUIT_LENGTH,
  type FiscalConfigurationInput,
  type FiscalDocumentConsistencyInput,
  type FiscalValidationResult,
  fiscalConfigurationInputSchema,
  fiscalDocumentConsistencySchema,
} from "@/modules/fiscal/types";

const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;
const FISCAL_STATUSES_REQUIRING_ACTIVE_INTEGRATION = new Set<FiscalDocumentStatus>([
  FiscalDocumentStatus.PENDING,
  FiscalDocumentStatus.SUBMITTED,
  FiscalDocumentStatus.AUTHORIZED,
  FiscalDocumentStatus.REJECTED,
  FiscalDocumentStatus.ERROR,
  FiscalDocumentStatus.CANCELLED,
]);

export function normalizeCuit(value: string) {
  return value.replace(/\D/g, "");
}

export function validateCuit(value: string) {
  const normalized = normalizeCuit(value);

  if (normalized.length !== CUIT_LENGTH) {
    throw new Error("El CUIT debe contener exactamente 11 dígitos.");
  }

  const digits = normalized.split("").map((digit) => Number(digit));
  const checksumBase = digits
    .slice(0, 10)
    .reduce((sum, digit, index) => sum + digit * CUIT_WEIGHTS[index], 0);
  const mod = 11 - (checksumBase % 11);
  const verifier = mod === 11 ? 0 : mod === 10 ? 9 : mod;

  if (digits[10] !== verifier) {
    throw new Error("El CUIT informado no supera la validación de dígito verificador.");
  }

  return normalized;
}

export function validateFiscalConfiguration(
  input: FiscalConfigurationInput,
): FiscalValidationResult<FiscalConfigurationInput & { cuit: string }> {
  const parsed = fiscalConfigurationInputSchema.parse(input);
  const normalizedCuit = validateCuit(parsed.cuit);
  const warnings: string[] = [];

  if (!parsed.integrationEnabled) {
    warnings.push("La integración fiscal está deshabilitada; solo se podrán generar borradores internos.");
  }

  if (parsed.fiscalEnvironment === "PRODUCTION" && !parsed.certificateReference) {
    warnings.push("El ambiente productivo no tiene referencia de certificado asociada todavía.");
  }

  if (parsed.fiscalEnvironment === "PRODUCTION" && !parsed.privateKeyReference) {
    warnings.push("El ambiente productivo no tiene referencia de clave privada asociada todavía.");
  }

  return {
    value: {
      ...parsed,
      cuit: normalizedCuit,
    },
    warnings,
  };
}

export function validateFiscalDocumentConsistency(
  input: FiscalDocumentConsistencyInput,
): FiscalValidationResult<FiscalDocumentConsistencyInput> {
  const parsed = fiscalDocumentConsistencySchema.parse(input);
  const warnings: string[] = [];

  if (!parsed.pointOfSaleActive) {
    throw new Error("El punto de venta fiscal indicado está inactivo.");
  }

  if (!parsed.fiscalConfigActive) {
    throw new Error("La configuración fiscal de la empresa está inactiva.");
  }

  if (FISCAL_STATUSES_REQUIRING_ACTIVE_INTEGRATION.has(parsed.fiscalStatus) && !parsed.integrationEnabled) {
    throw new Error("El estado fiscal solicitado requiere una integración fiscal habilitada.");
  }

  if (parsed.fiscalStatus === FiscalDocumentStatus.READY && !parsed.integrationEnabled) {
    warnings.push("El documento quedó listo para integración futura, pero la integración aún está deshabilitada.");
  }

  return {
    value: parsed,
    warnings,
  };
}
