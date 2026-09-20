import type { BookingCartDraft, BookingLineDraft } from "./bookingCartDraft";
import { hasDuplicateLine, intervalStaysOnSameDay } from "./timetableRules";

export const TIMETABLE_CART_STORAGE_KEY = "facilityBooking.timetableCart";

export interface CartStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isValidLineDraft = (value: unknown): value is BookingLineDraft => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { sequence, facilityId, start, end } = value as Record<string, unknown>;
  if (typeof sequence !== "number" || !Number.isFinite(sequence) || sequence < 1) {
    return false;
  }
  if (typeof facilityId !== "string" || !facilityId) {
    return false;
  }
  if (typeof start !== "string" || typeof end !== "string") {
    return false;
  }
  return intervalStaysOnSameDay({ start, end });
};

const sanitizeLines = (raw: unknown): BookingLineDraft[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const lines: BookingLineDraft[] = [];
  for (const item of raw) {
    if (!isValidLineDraft(item)) {
      continue;
    }
    const line: BookingLineDraft = {
      sequence: item.sequence,
      facilityId: item.facilityId,
      start: item.start,
      end: item.end,
    };
    if (hasDuplicateLine(lines, line)) {
      continue;
    }
    lines.push(line);
  }
  return lines.sort((left, right) => left.sequence - right.sequence);
};

const isValidDraftShape = (
  value: unknown
): value is { date: unknown; ministryId?: unknown; title?: unknown; lines: unknown } => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.date === "string" && Array.isArray(candidate.lines);
};

export const saveTimetableCart = (storage: CartStorage, draft: BookingCartDraft | null): void => {
  if (!draft || draft.lines.length === 0) {
    storage.removeItem(TIMETABLE_CART_STORAGE_KEY);
    return;
  }
  storage.setItem(TIMETABLE_CART_STORAGE_KEY, JSON.stringify(draft));
};

export const loadTimetableCart = (
  storage: CartStorage,
  date: string,
  ministryId: string | undefined
): BookingCartDraft | null => {
  const raw = storage.getItem(TIMETABLE_CART_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isValidDraftShape(parsed)) {
    return null;
  }
  if (parsed.date !== date) {
    return null;
  }
  const storedMinistryId = typeof parsed.ministryId === "string" ? parsed.ministryId : undefined;
  if (storedMinistryId !== (ministryId || undefined)) {
    return null;
  }
  const lines = sanitizeLines(parsed.lines);
  if (lines.length === 0) {
    return null;
  }
  const title = typeof parsed.title === "string" ? parsed.title : undefined;
  return { date, ministryId: storedMinistryId, title, lines };
};
