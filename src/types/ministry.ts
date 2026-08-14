export interface MinistryItem {
  id: string;
  name?: string | null;
  status: string;
  hasPriorityBooking?: boolean;
  isActive?: boolean;
}

export interface MinistryListResponse {
  items: MinistryItem[];
}

export interface AssignablePosition {
  id: string;
  name?: string | null;
  code?: string | null;
  team?: string | null;
  office?: string | null;
}

export interface AssignablePositionListResponse {
  items: AssignablePosition[];
}

export interface LocaleItem {
  id: string;
  languageCode?: string;
  regionCode?: string | null;
  isDefault?: boolean;
}

export interface LocaleListResponse {
  items: LocaleItem[];
}

export interface CreateMinistryApplicationPayload {
  ownerPositionId: string;
  hasPriorityBooking?: boolean;
  translations: Array<{
    localeId: string;
    name: string;
    description?: string;
  }>;
  members?: Array<{
    userId: string;
    memberRole: "primary" | "secondary";
  }>;
}
