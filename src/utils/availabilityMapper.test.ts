import { describe, expect, it } from "vitest";
import { mapAvailabilityToRoomDays } from "./availabilityMapper";

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
});
