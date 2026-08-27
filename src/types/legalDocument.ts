export const FACILITY_BOOKING_PRODUCT = "facility-booking";

export type LegalDocumentKind = "terms_of_service" | "privacy_policy";

export const LEGAL_DOCUMENT_PATHS = {
  terms_of_service: "/terms-of-service",
  privacy_policy: "/privacy-policy",
} as const satisfies Record<LegalDocumentKind, string>;

export interface PublicLegalDocument {
  product: string;
  kind: string;
  body: string;
  effectiveDate: string;
}
