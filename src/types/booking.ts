export type BookingMode = "by_date" | "by_room" | "multi_rooms";

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DayAvailability {
  am: TimeSlot[];
  pm: TimeSlot[];
}

export interface Room {
  id: string;
  name: string;
  capacityMin: number;
  capacityMax: number;
  imageUrl?: string;
  galleryImages: string[];
}

export interface RoomAvailability extends Room {
  availability: DayAvailability;
}

export interface RoomGridCardVariant {
  type: "by_room" | "multi_room";
  isSelected?: boolean;
}
