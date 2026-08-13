import { API_ENDPOINTS } from "@/api/config";
import type {
  AssignablePositionListResponse,
  CreateMinistryApplicationPayload,
  LocaleItem,
  LocaleListResponse,
  MinistryListResponse,
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
    const response = await httpClient.get<AssignablePositionListResponse>(
      API_ENDPOINTS.ORG.ASSIGNABLE_POSITIONS,
    );
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

  async createApplication(payload: CreateMinistryApplicationPayload): Promise<{ id: string }> {
    const response = await httpClient.post<{ id: string }>(API_ENDPOINTS.MINISTRY.APPLICATIONS, payload);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create ministry application");
    }
    return response.data;
  }
}

export const ministryService = new MinistryService();
export default ministryService;
