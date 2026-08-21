import { API_ENDPOINTS } from "@/api/config";
import type { DayAvailability, RoomAvailability } from "@/types/booking";
import { httpClient } from "./httpClient";

interface ApiTimeSlot {
  start: string;
  end: string;
}

interface ApiRoomAvailabilityItem {
  id: string;
  code: string;
  name?: string | null;
  roomNumber?: string | null;
  capacity?: number | null;
  availability: {
    am: ApiTimeSlot[];
    pm: ApiTimeSlot[];
  };
}

interface ApiRoomAvailabilityList {
  date: string;
  items: ApiRoomAvailabilityItem[];
}

interface CreateBookingPayload {
  startAt: string;
  endAt: string;
  isMissionAligned?: boolean;
  ministryId?: string | null;
  rooms: Array<{
    facilityId: string;
    startAt?: string;
    endAt?: string;
    sequence?: number;
  }>;
  remark?: string;
}

const mapAvailability = (item: ApiRoomAvailabilityItem): RoomAvailability => {
  const availability: DayAvailability = {
    am: item.availability?.am ?? [],
    pm: item.availability?.pm ?? [],
  };
  const capacity = item.capacity ?? 0;
  return {
    id: item.id,
    name: item.name || item.code,
    capacityMin: capacity,
    capacityMax: capacity,
    galleryImages: [],
    availability,
  };
};

class FacilityService {
  async getAvailability(date: string, ministryId?: string | null): Promise<RoomAvailability[]> {
    const params: Record<string, unknown> = { date };
    if (ministryId) {
      params.ministryId = ministryId;
    }
    const response = await httpClient.get<ApiRoomAvailabilityList>(API_ENDPOINTS.FACILITY.AVAILABILITY, params);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load availability");
    }
    return (response.data.items || []).map(mapAvailability);
  }

  async createBooking(payload: CreateBookingPayload): Promise<{ id: string }> {
    const response = await httpClient.post<{ id: string }>(API_ENDPOINTS.FACILITY.BOOKINGS, payload);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create booking");
    }
    return response.data;
  }

  async listMyBookings(): Promise<unknown> {
    const response = await httpClient.get(API_ENDPOINTS.FACILITY.MY_BOOKINGS);
    if (!response.success) {
      throw new Error(response.message || "Failed to load bookings");
    }
    return response.data;
  }
}

export const facilityService = new FacilityService();
export default facilityService;
