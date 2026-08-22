import { API_ENDPOINTS } from "@/api/config";
import { mapAvailabilityToRoomDays, type ApiRoomAvailabilityList } from "@/utils/availabilityMapper";
import type { RoomDay } from "@/utils/timetableRules";
import { httpClient } from "./httpClient";

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

class FacilityService {
  async getAvailability(date: string, ministryId?: string | null): Promise<RoomDay[]> {
    const params: Record<string, unknown> = { date };
    if (ministryId) {
      params.ministryId = ministryId;
    }
    const response = await httpClient.get<ApiRoomAvailabilityList>(API_ENDPOINTS.FACILITY.AVAILABILITY, params);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load availability");
    }
    return mapAvailabilityToRoomDays(response.data);
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
