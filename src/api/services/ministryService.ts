import { API_ENDPOINTS } from "@/api/config";
import type { ApiError } from "@/types/api";
import type {
  ApproveMinistryApplicationPayload,
  AssignablePositionListResponse,
  CreateMinistryApplicationPayload,
  LocaleItem,
  LocaleListResponse,
  MinistryApprovalPendingListResponse,
  MinistryCatalogListResponse,
  MinistryDetail,
  MinistryListResponse,
  OrgUserSearchListResponse,
  RejectMinistryApplicationPayload,
  UpdateMinistryApplicationPayload,
} from "@/types/ministry";
import { httpClient } from "./httpClient";

interface LocaleApiItem {
  id: string;
  languageCode?: string;
  language_code?: string;
  regionCode?: string | null;
  region_code?: string | null;
  isDefault?: boolean;
  is_default?: boolean;
}

const mapLocaleItem = (item: LocaleApiItem): LocaleItem => ({
  id: item.id,
  languageCode: item.languageCode || item.language_code,
  regionCode: item.regionCode ?? item.region_code ?? null,
  isDefault: item.isDefault ?? item.is_default ?? false,
});

const isApiError = (error: unknown): error is ApiError => {
  return Boolean(error && typeof error === "object" && "code" in error && typeof (error as ApiError).code === "number");
};

class MinistryService {
  async listMine(includePending = true): Promise<MinistryListResponse> {
    const response = await httpClient.get<MinistryListResponse>(API_ENDPOINTS.MINISTRY.MINE, {
      includePending,
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load ministries");
    }
    return response.data;
  }

  async listAssignablePositions(): Promise<AssignablePositionListResponse> {
    const response = await httpClient.get<AssignablePositionListResponse>(API_ENDPOINTS.ORG.ASSIGNABLE_POSITIONS);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load positions");
    }
    return response.data;
  }

  async listLocales(): Promise<LocaleListResponse> {
    const response = await httpClient.get<{ items: LocaleApiItem[] }>(API_ENDPOINTS.ORG.LOCALES);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load locales");
    }
    return {
      items: (response.data.items || []).map(mapLocaleItem),
    };
  }

  async listMinistryTypes(): Promise<MinistryCatalogListResponse> {
    const response = await httpClient.get<MinistryCatalogListResponse>(API_ENDPOINTS.MINISTRY.MINISTRY_TYPES);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load ministry types");
    }
    return response.data;
  }

  async listTargetAudiences(): Promise<MinistryCatalogListResponse> {
    const response = await httpClient.get<MinistryCatalogListResponse>(API_ENDPOINTS.MINISTRY.TARGET_AUDIENCES);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load target audiences");
    }
    return response.data;
  }

  async searchUsers(query: string): Promise<OrgUserSearchListResponse> {
    const response = await httpClient.get<OrgUserSearchListResponse>(API_ENDPOINTS.ORG.USER_SEARCH, { q: query });
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to search users");
    }
    return response.data;
  }

  async createApplication(payload: CreateMinistryApplicationPayload): Promise<{ id: string }> {
    try {
      const response = await httpClient.post<{ id: string }>(API_ENDPOINTS.MINISTRY.APPLICATIONS, payload);
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to create ministry application");
      }
      return response.data;
    } catch (error) {
      if (isApiError(error)) {
        throw error;
      }
      throw error instanceof Error ? error : new Error("Failed to create ministry application");
    }
  }

  async listPendingApprovalsForMe(): Promise<MinistryApprovalPendingListResponse> {
    const response = await httpClient.get<MinistryApprovalPendingListResponse>(
      API_ENDPOINTS.MINISTRY.PENDING_APPROVALS_FOR_ME
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load pending approvals");
    }
    return {
      items: response.data.items || [],
    };
  }

  async getApplicationDetail(ministryId: string): Promise<MinistryDetail> {
    const response = await httpClient.get<MinistryDetail>(API_ENDPOINTS.MINISTRY.APPLICATION_DETAIL(ministryId));
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load ministry application");
    }
    return {
      ...response.data,
      translations: response.data.translations || [],
      members: response.data.members || [],
      targetAudiences: response.data.targetAudiences || [],
    };
  }

  async updateRejectedApplication(ministryId: string, payload: UpdateMinistryApplicationPayload): Promise<void> {
    try {
      const response = await httpClient.put<void>(API_ENDPOINTS.MINISTRY.APPLICATION(ministryId), payload);
      if (!response.success) {
        throw new Error(response.message || "Failed to update ministry application");
      }
    } catch (error) {
      if (isApiError(error)) {
        throw error;
      }
      throw error instanceof Error ? error : new Error("Failed to update ministry application");
    }
  }

  async resubmitApplication(ministryId: string): Promise<void> {
    const response = await httpClient.post<void>(API_ENDPOINTS.MINISTRY.RESUBMIT_APPLICATION(ministryId));
    if (!response.success) {
      throw new Error(response.message || "Failed to resubmit ministry application");
    }
  }

  async approveApplication(ministryId: string, payload: ApproveMinistryApplicationPayload = {}): Promise<void> {
    try {
      const response = await httpClient.post<void>(API_ENDPOINTS.MINISTRY.APPROVE_APPLICATION(ministryId), payload);
      if (!response.success) {
        throw new Error(response.message || "Failed to approve ministry application");
      }
    } catch (error) {
      if (isApiError(error)) {
        throw error;
      }
      throw error instanceof Error ? error : new Error("Failed to approve ministry application");
    }
  }

  async rejectApplication(ministryId: string, payload: RejectMinistryApplicationPayload): Promise<void> {
    try {
      const response = await httpClient.post<void>(API_ENDPOINTS.MINISTRY.REJECT_APPLICATION(ministryId), payload);
      if (!response.success) {
        throw new Error(response.message || "Failed to reject ministry application");
      }
    } catch (error) {
      if (isApiError(error)) {
        throw error;
      }
      throw error instanceof Error ? error : new Error("Failed to reject ministry application");
    }
  }
}

export const ministryService = new MinistryService();
export default ministryService;
