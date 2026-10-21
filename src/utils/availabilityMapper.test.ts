import { describe, expect, it } from "vitest";
import { mapAvailabilityToRoomDays, maxBookingLinesFromPayload } from "./availabilityMapper";
import { MAX_BOOKING_LINES } from "./timetableRules";

describe("mapAvailabilityToRoomDays", () => {
  it("maps cells and Template duration from the member availability payload", () => {
    const rooms = mapAvailabilityToRoomDays({
      date: "2026-07-20",
      items: [
        {
          id: "gym-id",
          code: "gym",
          name: "Gym",
          capacity: 200,
          templates: [{ start: "09:00", end: "17:00", slotDurationMinutes: 60 }],
          cells: [
            { start: "00:00", end: "00:30", state: "closed" },
            { start: "09:00", end: "09:30", state: "available" },
            { start: "10:00", end: "10:30", state: "unavailable" },
            { start: "11:00", end: "11:30", state: "override" },
          ],
        },
      ],
    });

    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.templates[0]?.slotDurationMinutes).toBe(60);
    expect(rooms[0]?.cells).toHaveLength(48);
    expect(rooms[0]?.cells[0]).toEqual({ start: "00:00", end: "00:30", state: "closed" });
    expect(rooms[0]?.cells.at(-1)).toEqual({ start: "23:30", end: "24:00", state: "closed" });
    expect(rooms[0]?.cells.find((cell) => cell.start === "09:00")?.state).toBe("available");
    expect(rooms[0]?.cells.find((cell) => cell.start === "10:00")?.state).toBe("unavailable");
    expect(rooms[0]?.cells.find((cell) => cell.start === "11:00")?.state).toBe("override");
  });

  it("maps photoUrls onto the room header photos", () => {
    const rooms = mapAvailabilityToRoomDays({
      date: "2026-07-20",
      items: [
        {
          id: "gym-id",
          code: "gym",
          name: "Gym",
          capacity: 200,
          photoUrls: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
          cells: [{ start: "09:00", end: "09:30", state: "available" }],
        },
        {
          id: "chapel-id",
          code: "chapel",
          name: "Chapel",
          capacity: 10,
          photo_urls: ["https://cdn.example/c.jpg"],
          cells: [{ start: "09:00", end: "09:30", state: "available" }],
        },
        {
          id: "office-id",
          code: "office",
          name: "Office",
          capacity: 4,
          cells: [{ start: "09:00", end: "09:30", state: "available" }],
        },
      ],
    });

    expect(rooms[0]?.photoUrls).toEqual(["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"]);
    expect(rooms[1]?.photoUrls).toEqual(["https://cdn.example/c.jpg"]);
    expect(rooms[2]?.photoUrls).toEqual([]);
  });

  it("does not infer opening windows or template duration from AM/PM free lists", () => {
    const rooms = mapAvailabilityToRoomDays({
      date: "2026-08-26",
      items: [
        {
          id: "sanctuary-id",
          code: "sanctuary-hall",
          name: "Sanctuary Hall",
          capacity: 390,
          availability: {
            am: [
              { start: "08:00", end: "09:00" },
              { start: "09:00", end: "10:00" },
            ],
            pm: [{ start: "12:00", end: "13:00" }],
          },
        },
      ],
    });

    expect(rooms[0]?.templates).toEqual([]);
    expect(rooms[0]?.cells.every((cell) => cell.state === "closed")).toBe(true);
  });

  it("keeps authoritative cells, templates, and events when AM/PM free lists disagree", () => {
    const rooms = mapAvailabilityToRoomDays({
      date: "2026-08-26",
      items: [
        {
          id: "hall-id",
          code: "hall",
          name: "Hall",
          capacity: 40,
          templates: [{ start: "09:00", end: "12:00", slotDurationMinutes: 90 }],
          cells: [
            { start: "10:00", end: "10:30", state: "override" },
            { start: "10:30", end: "11:00", state: "unavailable" },
          ],
          events: [
            {
              start: "10:00",
              end: "11:00",
              occupancyKind: "ministry",
              isOverridable: false,
              ministryName: "Choir",
              contactDisplayName: "Ada Steward",
              contactEmail: "ada@efcnewlife.org",
            },
          ],
          availability: {
            am: [{ start: "10:00", end: "11:00" }],
          },
        },
        {
          id: "gym-id",
          code: "gym",
          name: "Gym",
          capacity: 80,
          cells: [{ start: "09:00", end: "09:30", state: "unavailable" }],
        },
      ],
    });

    expect(rooms[0]?.templates).toEqual([{ start: "09:00", end: "12:00", slotDurationMinutes: 90 }]);
    expect(rooms[0]?.cells.find((cell) => cell.start === "10:00")?.state).toBe("override");
    expect(rooms[0]?.cells.find((cell) => cell.start === "10:30")?.state).toBe("unavailable");
    expect(rooms[0]?.cells.find((cell) => cell.start === "09:00")?.state).toBe("closed");
    expect(rooms[0]?.events).toEqual([
      {
        start: "10:00",
        end: "11:00",
        occupancyKind: "ministry",
        isOverridable: false,
        ministryName: "Choir",
        contactDisplayName: "Ada Steward",
        contactEmail: "ada@efcnewlife.org",
      },
    ]);
    expect(rooms[1]?.events).toEqual([]);
  });
});

describe("maxBookingLinesFromPayload", () => {
  it("reads the live cap carried on the availability response", () => {
    expect(maxBookingLinesFromPayload({ date: "2026-07-20", items: [], maxBookingLines: 2 })).toBe(2);
    expect(maxBookingLinesFromPayload({ date: "2026-07-20", items: [], maxBookingLines: 10 })).toBe(10);
  });

  it("falls back to the default cap when the response omits or malforms the field", () => {
    expect(maxBookingLinesFromPayload({ date: "2026-07-20", items: [] })).toBe(MAX_BOOKING_LINES);
    expect(maxBookingLinesFromPayload({ date: "2026-07-20", items: [], maxBookingLines: 0 })).toBe(MAX_BOOKING_LINES);
    expect(maxBookingLinesFromPayload({ date: "2026-07-20", items: [], maxBookingLines: -1 })).toBe(MAX_BOOKING_LINES);
  });
});
