import {
  MAX_BOOKING_LINES,
  SLOT_MINUTES,
  minutesToClock,
  type CellState,
  type RoomDay,
  type RoomOccupancyEvent,
  type RoomTemplateWindow,
  type TimeCell,
} from "./timetableRules";

interface ApiTimeCell {
  start: string;
  end: string;
  state: string;
}

interface ApiTemplateWindow {
  start: string;
  end: string;
  slotDurationMinutes?: number;
  slot_duration_minutes?: number;
}

interface ApiTimeWindow {
  start: string;
  end: string;
}

interface ApiOccupancyEvent {
  start: string;
  end: string;
  occupancyKind?: string;
  occupancy_kind?: string;
  isOverridable?: boolean;
  is_overridable?: boolean;
  ministryName?: string | null;
  ministry_name?: string | null;
  contactDisplayName?: string | null;
  contact_display_name?: string | null;
  contactEmail?: string | null;
  contact_email?: string | null;
}

interface ApiRoomAvailabilityItem {
  id: string;
  code: string;
  name?: string | null;
  capacity?: number | null;
  photoUrls?: string[];
  photo_urls?: string[];
  templates?: ApiTemplateWindow[];
  cells?: ApiTimeCell[];
  events?: ApiOccupancyEvent[];
  availability?: {
    am?: ApiTimeWindow[];
    pm?: ApiTimeWindow[];
  };
}

export interface ApiRoomAvailabilityList {
  date: string;
  items: ApiRoomAvailabilityItem[];
  maxBookingLines?: number;
}

export const maxBookingLinesFromPayload = (payload: ApiRoomAvailabilityList): number => {
  return typeof payload.maxBookingLines === "number" && payload.maxBookingLines > 0
    ? payload.maxBookingLines
    : MAX_BOOKING_LINES;
};

const CELL_STATES: CellState[] = ["available", "unavailable", "closed", "override"];

const isCellState = (value: string): value is CellState => {
  return CELL_STATES.some((state) => state === value);
};

const closedDayCells = (): RoomDay["cells"] => {
  const cells: RoomDay["cells"] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += SLOT_MINUTES) {
    cells.push({
      start: minutesToClock(minutes),
      end: minutesToClock(minutes + SLOT_MINUTES),
      state: "closed",
    });
  }
  return cells;
};

const templatesFromApi = (windows: ApiTemplateWindow[] | undefined): RoomTemplateWindow[] => {
  return (windows || []).map((window) => ({
    start: window.start,
    end: window.end,
    slotDurationMinutes: window.slotDurationMinutes ?? window.slot_duration_minutes ?? 0,
  }));
};

const eventsFromApi = (events: ApiOccupancyEvent[] | undefined): RoomOccupancyEvent[] => {
  const mapped: RoomOccupancyEvent[] = [];
  for (const event of events || []) {
    const kind = event.occupancyKind ?? event.occupancy_kind;
    if (kind !== "ministry" && kind !== "rental") {
      continue;
    }
    mapped.push({
      start: event.start,
      end: event.end,
      occupancyKind: kind,
      isOverridable: Boolean(event.isOverridable ?? event.is_overridable),
      ministryName: event.ministryName ?? event.ministry_name ?? null,
      contactDisplayName: event.contactDisplayName ?? event.contact_display_name ?? null,
      contactEmail: event.contactEmail ?? event.contact_email ?? null,
    });
  }
  return mapped;
};

// Clock strings are facility-local. Do not shift them into the browser timezone.
export const mapAvailabilityToRoomDays = (payload: ApiRoomAvailabilityList): RoomDay[] => {
  return (payload.items || []).map((item) => {
    const byStart = new Map<string, TimeCell>();
    for (const cell of item.cells || []) {
      if (!isCellState(cell.state)) {
        continue;
      }
      byStart.set(cell.start, { start: cell.start, end: cell.end, state: cell.state });
    }
    const templates = templatesFromApi(item.templates);
    return {
      id: item.id,
      code: item.code,
      name: item.name || item.code,
      capacity: item.capacity ?? 0,
      photoUrls: (item.photoUrls ?? item.photo_urls ?? []).filter((url) => url.length > 0),
      templates,
      cells: closedDayCells().map((cell) => byStart.get(cell.start) ?? cell),
      events: eventsFromApi(item.events),
    };
  });
};
