import { API_ENDPOINTS } from "@/api/config";
import type { ApiError } from "@/types/api";
import { FACILITY_BOOKING_PRODUCT, type LegalDocumentKind, type PublicLegalDocument } from "@/types/legalDocument";
import { mapLegalDocumentFetchResult, type LegalDocumentViewState } from "@/utils/legalDocumentViewModel";
import { httpClient } from "./httpClient";

export const legalDocumentService = {
  async getPublic(kind: LegalDocumentKind): Promise<LegalDocumentViewState> {
    try {
      const response = await httpClient.get<PublicLegalDocument>(
        API_ENDPOINTS.CONTENT.LEGAL_DOCUMENT(FACILITY_BOOKING_PRODUCT, kind)
      );
      return mapLegalDocumentFetchResult({
        httpStatus: response.code,
        body: response.data.body,
        effectiveDate: response.data.effectiveDate,
      });
    } catch (error) {
      const apiError = error as ApiError;
      return mapLegalDocumentFetchResult({
        httpStatus: apiError.code,
      });
    }
  },
};
