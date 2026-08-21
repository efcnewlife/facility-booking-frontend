import type { Room } from "@/types/booking";

export const MOCK_ROOMS: Room[] = [
  {
    id: "sanctuary",
    name: "Sanctuary",
    capacityMin: 50,
    capacityMax: 500,
    galleryImages: [
      "/images/booking/gradient-bg.png",
      "/images/booking/gradient-bg.png",
      "/images/booking/gradient-bg.png",
      "/images/booking/gradient-bg.png",
    ],
  },
  {
    id: "gym",
    name: "Gym",
    capacityMin: 10,
    capacityMax: 80,
    galleryImages: ["/images/booking/gradient-bg.png", "/images/booking/gradient-bg.png"],
  },
  {
    id: "meeting-xxx",
    name: "Meeting Room XXX",
    capacityMin: 4,
    capacityMax: 12,
    galleryImages: ["/images/booking/gradient-bg.png"],
  },
  {
    id: "meeting-yyy",
    name: "Meeting Room YYY",
    capacityMin: 6,
    capacityMax: 20,
    galleryImages: ["/images/booking/gradient-bg.png"],
  },
  {
    id: "meeting-zzz",
    name: "Meeting Room ZZZ",
    capacityMin: 8,
    capacityMax: 30,
    galleryImages: ["/images/booking/gradient-bg.png"],
  },
  {
    id: "meeting-aaa",
    name: "Meeting Room AAA",
    capacityMin: 4,
    capacityMax: 16,
    galleryImages: ["/images/booking/gradient-bg.png"],
  },
];

export const MAX_MULTI_ROOM_SELECTION = 3;
