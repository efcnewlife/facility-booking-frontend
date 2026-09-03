import { describe, expect, it } from "vitest";

import {
  allLinesCoverAvailability,
  buildCreateBookingPayload,
  buildPreviewQuotePayload,
  canAddRoomToDraft,
  envelopeClocks,
  lineCoversAvailability,
  removeLineFromDraft,
} from "./bookingDetailsDraft";
import type { BookingCartDraft } from "./bookingCartDraft";
import type { RoomDay } from "./timetableRules";

const gymCells = (): RoomDay["cells"] => {
  const cells: RoomDay["cells"] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const startHour = Math.floor(minutes / 60);
    const startMinute = minutes % 60;
    const endMinutes = minutes + 30;
    const start = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
    const end =
      endMinutes >= 24 * 60
        ? "24:00"
        : `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const inOpenHours = minutes >= 9 * 60 && minutes < 17 * 60;
    cells.push({ start, end, state: inOpenHours ? "available" : "closed" });
  }
  return cells;
};

const makeRoom = (id: string): RoomDay => ({
  id,
  code: id,
  name: id,
  capacity: 50,
  photoUrls: [],
  templates: [{ start: "09:00", end: "17:00", slotDurationMinutes: 60 }],
  cells: gymCells(),
});

const baseDraft: BookingCartDraft = {
  date: "2026-09-01",
  ministryId: "m-1",
  lines: [
    { sequence: 1, facilityId: "room-a", start: "10:00", end: "11:00" },
    { sequence: 2, facilityId: "room-a", start: "14:00", end: "15:00" },
  ],
};

describe("envelopeClocks", () => {
  it("returns min start and max end across lines", () => {
    expect(envelopeClocks(baseDraft.lines)).toEqual({ start: "10:00", end: "15:00" });
  });
});

describe("buildPreviewQuotePayload", () => {
  it("maps each cart line to a per-line preview interval", () => {
    const payload = buildPreviewQuotePayload(baseDraft);
    expect(payload.lines).toHaveLength(2);
    expect(payload.lines[0].facilityId).toBe("room-a");
    expect(payload.lines[1].startAt).toContain("T");
    expect(payload.ministryId).toBe("m-1");
    expect(payload.isMissionAligned).toBe(true);
  });
});

describe("buildCreateBookingPayload", () => {
  it("sends header envelope and per-line room intervals", () => {
    const payload = buildCreateBookingPayload(baseDraft);
    expect(payload.rooms).toEqual([
      expect.objectContaining({ facilityId: "room-a", sequence: 1 }),
      expect.objectContaining({ facilityId: "room-a", sequence: 2 }),
    ]);
    expect(payload.rooms[0].startAt).not.toBe(payload.rooms[1].startAt);
    expect(new Date(payload.startAt).getTime()).toBeLessThan(new Date(payload.endAt).getTime());
  });
});

describe("lineCoversAvailability", () => {
  it("checks availability for the line interval only", () => {
    const rooms = [makeRoom("room-a"), makeRoom("room-b")];
    expect(lineCoversAvailability(rooms, baseDraft.lines[0])).toBe(true);
    expect(lineCoversAvailability(rooms, baseDraft.lines[1])).toBe(true);
    expect(
      lineCoversAvailability(rooms, { sequence: 3, facilityId: "room-missing", start: "10:00", end: "11:00" })
    ).toBe(false);
  });
});

describe("allLinesCoverAvailability", () => {
  it("requires every line to pass availability reload", () => {
    const room = makeRoom("room-a");
    room.cells = room.cells.map((cell) =>
      cell.start === "14:00" || cell.start === "14:30" ? { ...cell, state: "unavailable" } : cell
    );
    expect(allLinesCoverAvailability([room], baseDraft)).toBe(false);
    expect(allLinesCoverAvailability([makeRoom("room-a")], baseDraft)).toBe(true);
  });
});

describe("removeLineFromDraft", () => {
  it("drops one line by sequence and returns null when empty", () => {
    expect(removeLineFromDraft(baseDraft, 1)?.lines).toHaveLength(1);
    expect(removeLineFromDraft({ ...baseDraft, lines: [baseDraft.lines[0]] }, 1)).toBeNull();
  });
});

describe("canAddRoomToDraft", () => {
  it("allows add room until three lines", () => {
    expect(canAddRoomToDraft(baseDraft)).toBe(true);
    expect(
      canAddRoomToDraft({
        ...baseDraft,
        lines: [...baseDraft.lines, { sequence: 3, facilityId: "room-c", start: "16:00", end: "17:00" }],
      })
    ).toBe(false);
  });
});
