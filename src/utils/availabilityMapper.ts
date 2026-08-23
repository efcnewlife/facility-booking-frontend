import {
  SLOT_MINUTES,
  clockToMinutes,
  minutesToClock,
  type CellState,
  type RoomDay,
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

interface ApiRoomAvailabilityItem {
  id: string;
  code: string;
  name?: string | null;
  capacity?: number | null;
  photoUrls?: string[];
  photo_urls?: string[];
  templates?: ApiTemplateWindow[];
  cells?: ApiTimeCell[];
  availability?: {
    am?: ApiTimeWindow[];
    pm?: ApiTimeWindow[];
  };
}

export interface ApiRoomAvailabilityList {
  date: string;
  items: ApiRoomAvailabilityItem[];
}

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

const amPmSlots = (item: ApiRoomAvailabilityItem): ApiTimeWindow[] => {
  return [...(item.availability?.am || []), ...(item.availability?.pm || [])];
};

const expandWindowsToAvailableCells = (windows: ApiTimeWindow[]): Map<string, TimeCell> => {
  const byStart = new Map<string, TimeCell>();
  for (const window of windows) {
    let start = clockToMinutes(window.start);
    const end = clockToMinutes(window.end);
    while (start < end) {
      const next = start + SLOT_MINUTES;
      byStart.set(minutesToClock(start), {
        start: minutesToClock(start),
        end: minutesToClock(next),
        state: "available",
      });
      start = next;
    }
  }
  return byStart;
};

const cellsAndTemplatesFromAmPm = (
  slots: ApiTimeWindow[]
): { cells: Map<string, TimeCell>; templates: RoomTemplateWindow[] } => {
  const available = expandWindowsToAvailableCells(slots);
  if (slots.length === 0) {
    return { cells: available, templates: [] };
  }
  const sorted = [...slots].sort((left, right) => clockToMinutes(left.start) - clockToMinutes(right.start));
  const first = sorted[0];
  if (!first) {
    return { cells: available, templates: [] };
  }
  const open_start = clockToMinutes(first.start);
  const open_end = Math.max(...sorted.map((slot) => clockToMinutes(slot.end)));
  const duration = Math.max(SLOT_MINUTES, clockToMinutes(first.end) - clockToMinutes(first.start));
  const cells = new Map<string, TimeCell>();
  for (let start = open_start; start < open_end; start += SLOT_MINUTES) {
    const clock = minutesToClock(start);
    cells.set(
      clock,
      available.get(clock) ?? {
        start: clock,
        end: minutesToClock(start + SLOT_MINUTES),
        state: "unavailable",
      }
    );
  }
  return {
    cells,
    templates: [
      {
        start: minutesToClock(open_start),
        end: minutesToClock(open_end),
        slotDurationMinutes: duration,
      },
    ],
  };
};

const templatesFromApi = (windows: ApiTemplateWindow[] | undefined): RoomTemplateWindow[] => {
  return (windows || []).map((window) => ({
    start: window.start,
    end: window.end,
    slotDurationMinutes: window.slotDurationMinutes ?? window.slot_duration_minutes ?? 0,
  }));
};

export const mapAvailabilityToRoomDays = (payload: ApiRoomAvailabilityList): RoomDay[] => {
  return (payload.items || []).map((item) => {
    const byStart = new Map<string, TimeCell>();
    for (const cell of item.cells || []) {
      if (!isCellState(cell.state)) {
        continue;
      }
      byStart.set(cell.start, { start: cell.start, end: cell.end, state: cell.state });
    }
    const slots = amPmSlots(item);
    let templates = templatesFromApi(item.templates);
    if (byStart.size === 0 && slots.length > 0) {
      const inferred = cellsAndTemplatesFromAmPm(slots);
      inferred.cells.forEach((cell, start) => {
        byStart.set(start, cell);
      });
      if (templates.length === 0) {
        templates = inferred.templates;
      }
    }
    return {
      id: item.id,
      code: item.code,
      name: item.name || item.code,
      capacity: item.capacity ?? 0,
      photoUrls: (item.photoUrls ?? item.photo_urls ?? []).filter((url) => url.length > 0),
      templates,
      cells: closedDayCells().map((cell) => byStart.get(cell.start) ?? cell),
    };
  });
};
