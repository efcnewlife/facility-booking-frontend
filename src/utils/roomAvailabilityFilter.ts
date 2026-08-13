import type { DayAvailability, RoomAvailability, TimeSlot } from "@/types/booking";

/** Convert "HH:mm" to minutes from midnight. */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

/** Whether availability has a contiguous free block of at least minHours. */
export const hasContiguousHours = (availability: DayAvailability, minHours: number): boolean => {
  const slots: TimeSlot[] = [...(availability.am || []), ...(availability.pm || [])];
  if (slots.length === 0 || minHours <= 0) {
    return minHours <= 0;
  }
  const sorted = [...slots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  let runStart = timeToMinutes(sorted[0].start);
  let runEnd = timeToMinutes(sorted[0].end);
  const needed = minHours * 60;

  for (let index = 1; index < sorted.length; index += 1) {
    const start = timeToMinutes(sorted[index].start);
    const end = timeToMinutes(sorted[index].end);
    if (start <= runEnd) {
      runEnd = Math.max(runEnd, end);
    } else {
      if (runEnd - runStart >= needed) {
        return true;
      }
      runStart = start;
      runEnd = end;
    }
  }
  return runEnd - runStart >= needed;
};

export const filterRoomsByCriteria = (
  rooms: RoomAvailability[],
  capacity: number | null | undefined,
  minHours: number | null | undefined,
): RoomAvailability[] => {
  return rooms.filter((room) => {
    if (capacity != null && capacity > 0 && room.capacityMax < capacity) {
      return false;
    }
    if (minHours != null && minHours > 0 && !hasContiguousHours(room.availability, minHours)) {
      return false;
    }
    return true;
  });
};
