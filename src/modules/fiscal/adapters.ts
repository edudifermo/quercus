import { FiscalEnvironment } from "@prisma/client";
import type { FiscalRequestDraft } from "@/modules/fiscal/types";

export type FiscalAdapterCapability = "document-authorization" | "document-status" | "catalog-sync";

export type FiscalAdapterSubmissionResult = {
  accepted: boolean;
  externalReference?: string;
  rawResponse?: unknown;
  warnings?: string[];
};

export interface FiscalAuthorityAdapter {
  readonly provider: "ARCA_AFIP";
  readonly environment: FiscalEnvironment;
  readonly capabilities: FiscalAdapterCapability[];
  buildAuthorizationPayload(draft: FiscalRequestDraft): Promise<unknown>;
  submitDocument(draft: FiscalRequestDraft): Promise<FiscalAdapterSubmissionResult>;
}

export class NoopFiscalAuthorityAdapter implements FiscalAuthorityAdapter {
  readonly provider = "ARCA_AFIP" as const;
  readonly capabilities: FiscalAdapterCapability[] = ["document-authorization", "document-status", "catalog-sync"];

  constructor(readonly environment: FiscalEnvironment) {}

  async buildAuthorizationPayload(draft: FiscalRequestDraft) {
    return {
      provider: this.provider,
      environment: this.environment,
      source: {
        entityType: draft.sourceEntityType,
        entityId: draft.sourceEntityId,
      },
      document: {
        type: draft.fiscalDocumentType,
        pointOfSaleNumber: draft.pointOfSaleNumber,
        status: draft.fiscalStatus,
      },
      taxpayer: draft.taxpayer,
      payload: draft.payload ?? null,
    };
  }

  async submitDocument(): Promise<FiscalAdapterSubmissionResult> {
    return {
      accepted: false,
      warnings: [
        "NoopFiscalAuthorityAdapter solo define el contrato técnico para una futura integración real con ARCA/AFIP.",
      ],
    };
  }
}
