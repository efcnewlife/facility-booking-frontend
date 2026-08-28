import type { MinistryCatalogItem } from "@/types/ministry";

export const TARGET_AUDIENCE_ALL_AGES_CODE = "all_ages";
export const MIN_SECONDARY_STEWARD_SEARCH_LENGTH = 3;

export type { MinistryCatalogItem };

export function findCatalogCode(catalog: MinistryCatalogItem[], id: string): string | undefined {
  return catalog.find((item) => item.id === id)?.code;
}

export function isTargetAudienceSelectionValid(selectedIds: string[], catalog: MinistryCatalogItem[]): boolean {
  if (selectedIds.length === 0) {
    return true;
  }
  const codes = selectedIds.map((id) => findCatalogCode(catalog, id)).filter((code): code is string => Boolean(code));
  return !(codes.includes(TARGET_AUDIENCE_ALL_AGES_CODE) && codes.length > 1);
}

export function applyTargetAudienceSelection(
  currentIds: string[],
  audienceId: string,
  catalog: MinistryCatalogItem[],
  selected: boolean
): string[] {
  if (!selected) {
    return currentIds.filter((id) => id !== audienceId);
  }

  const code = findCatalogCode(catalog, audienceId);
  if (code === TARGET_AUDIENCE_ALL_AGES_CODE) {
    return [audienceId];
  }

  const withoutAllAges = currentIds.filter((id) => findCatalogCode(catalog, id) !== TARGET_AUDIENCE_ALL_AGES_CODE);
  if (withoutAllAges.includes(audienceId)) {
    return withoutAllAges;
  }
  return [...withoutAllAges, audienceId];
}

export function canSelectSecondarySteward(candidateUserId: string, currentUserId?: string): boolean {
  if (!candidateUserId) {
    return false;
  }
  return candidateUserId !== currentUserId;
}

export function shouldSearchSecondaryStewards(query: string): boolean {
  return query.trim().length >= MIN_SECONDARY_STEWARD_SEARCH_LENGTH;
}

export interface CreateMinistryFormValues {
  ministryName: string;
  ministryTypeId: string;
  ownerPositionId: string;
  purpose: string;
  localeId: string;
  targetAudienceIds: string[];
  secondaryStewardIds: string[];
}

export type CreateMinistryValidationKey =
  "createMinistryValidation" | "secondaryStewardRequired" | "targetAudienceAllAgesExclusive" | "secondaryStewardSelf";

export function validateCreateMinistryForm(
  values: CreateMinistryFormValues,
  catalog: MinistryCatalogItem[],
  currentUserId?: string
): CreateMinistryValidationKey | null {
  if (
    !values.ministryName.trim() ||
    !values.ministryTypeId ||
    !values.ownerPositionId ||
    !values.purpose.trim() ||
    !values.localeId
  ) {
    return "createMinistryValidation";
  }

  if (!isTargetAudienceSelectionValid(values.targetAudienceIds, catalog)) {
    return "targetAudienceAllAgesExclusive";
  }

  if (values.secondaryStewardIds.length === 0) {
    return "secondaryStewardRequired";
  }

  if (values.secondaryStewardIds.some((id) => !canSelectSecondarySteward(id, currentUserId))) {
    return "secondaryStewardSelf";
  }

  return null;
}
