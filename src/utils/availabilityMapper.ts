import { SLOT_MINUTES, minutesToClock, type CellState, type RoomDay, type TimeCell } from "./timetableRules";

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

interface ApiRoomAvailabilityItem {
  id: string;
  code: string;
  name?: string | null;
  capacity?: number | null;
  templates?: ApiTemplateWindow[];
  cells?: ApiTimeCell[];
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

export const mapAvailabilityToRoomDays = (payload: ApiRoomAvailabilityList): RoomDay[] => {
  return (payload.items || []).map((item) => {
    const byStart = new Map<string, TimeCell>();
    for (const cell of item.cells || []) {
      if (!isCellState(cell.state)) {
        continue;
      }
      byStart.set(cell.start, { start: cell.start, end: cell.end, state: cell.state });
    }
    return {
      id: item.id,
      code: item.code,
      name: item.name || item.code,
      capacity: item.capacity ?? 0,
      templates: (item.templates || []).map((window) => ({
        start: window.start,
        end: window.end,
        slotDurationMinutes: window.slotDurationMinutes ?? window.slot_duration_minutes ?? 0,
      })),
      cells: closedDayCells().map((cell) => byStart.get(cell.start) ?? cell),
    };
  });
};
