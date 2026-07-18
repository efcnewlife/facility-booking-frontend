import { MOCK_AVAILABILITY_BY_ROOM, MOCK_RESULTS_DATE } from "@/data/mockAvailability";
import { MOCK_ROOMS } from "@/data/mockRooms";
import type { DayAvailability, Room, RoomAvailability } from "@/types/booking";
import moment from "moment";

export const format_capacity_range = (room: Room): string => {
  return `${room.capacityMin}-${room.capacityMax}`;
};

export const format_time_slot = (slot: { start: string; end: string }): string => {
  return `${slot.start}–${slot.end}`;
};

export const get_all_rooms = (): Room[] => {
  return MOCK_ROOMS;
};

export const get_room_by_id = (room_id: string): Room | undefined => {
  return MOCK_ROOMS.find((room) => room.id === room_id);
};

export const get_availability_for_room = (room_id: string): DayAvailability => {
  return MOCK_AVAILABILITY_BY_ROOM[room_id] ?? { am: [], pm: [] };
};

export const has_availability = (availability: DayAvailability): boolean => {
  return availability.am.length > 0 || availability.pm.length > 0;
};

export const get_rooms_for_date = (date: Date): RoomAvailability[] => {
  const date_key = moment(date).format("YYYY-MM-DD");

  if (date_key !== MOCK_RESULTS_DATE) {
    return [];
  }

  return MOCK_ROOMS.map((room) => ({
    ...room,
    availability: get_availability_for_room(room.id),
  })).filter((room) => has_availability(room.availability));
};

export const get_rooms_by_ids = (room_ids: string[]): Room[] => {
  return room_ids
    .map((room_id) => get_room_by_id(room_id))
    .filter((room): room is Room => room !== undefined);
};
