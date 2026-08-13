import type { RoomsSearchQuery } from "@/utils/startBookingFlow";

export type RoomSearchCriteria = RoomsSearchQuery & {
  capacity?: number | null;
};

export const ROOM_SEARCH_STATE_KEY = "roomSearch";
