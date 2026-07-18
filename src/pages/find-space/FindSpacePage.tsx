import BookingDatePicker from "@/components/booking/BookingDatePicker";
import BookingModeTabs from "@/components/booking/BookingModeTabs";
import EmptyResultsPanel from "@/components/booking/EmptyResultsPanel";
import RoomGalleryModal from "@/components/booking/RoomGalleryModal";
import RoomGridCard from "@/components/booking/RoomGridCard";
import RoomResultCard from "@/components/booking/RoomResultCard";
import RoomSelectionBar from "@/components/booking/RoomSelectionBar";
import BookingHero from "@/components/booking/BookingHero";
import { MAX_MULTI_ROOM_SELECTION } from "@/data/mockRooms";
import type { BookingMode, Room, RoomAvailability } from "@/types/booking";
import { get_all_rooms, get_rooms_by_ids, get_rooms_for_date } from "@/utils/bookingMock";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

const MODE_QUERY_KEY = "mode";

const isBookingMode = (value: string | null): value is BookingMode => {
  return value === "by_date" || value === "by_room" || value === "multi_rooms";
};

const FindSpacePage = () => {
  const { t } = useTranslation("booking");
  const [searchParams, setSearchParams] = useSearchParams();

  const initialMode = isBookingMode(searchParams.get(MODE_QUERY_KEY))
    ? (searchParams.get(MODE_QUERY_KEY) as BookingMode)
    : "by_date";

  const [bookingMode, setBookingMode] = useState<BookingMode>(initialMode);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [galleryRoom, setGalleryRoom] = useState<Room | null>(null);

  const allRooms = useMemo(() => get_all_rooms(), []);
  const roomsForDate = useMemo(
    () => (selectedDate ? get_rooms_for_date(selectedDate) : []),
    [selectedDate],
  );
  const selectedRooms = useMemo(() => get_rooms_by_ids(selectedRoomIds), [selectedRoomIds]);

  const handleModeChange = (mode: BookingMode) => {
    setBookingMode(mode);
    setSearchParams({ [MODE_QUERY_KEY]: mode }, { replace: true });
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  const handleToggleRoomSelection = (room: Room) => {
    setSelectedRoomIds((current) => {
      if (current.includes(room.id)) {
        return current.filter((id) => id !== room.id);
      }

      if (current.length >= MAX_MULTI_ROOM_SELECTION) {
        return current;
      }

      return [...current, room.id];
    });
  };

  const handleStubAction = (label: string, room?: Room | RoomAvailability) => {
    console.info(label, room?.name ?? room?.id);
  };

  const modeDescription = () => {
    switch (bookingMode) {
      case "by_date":
        return t("descriptions.byDate");
      case "by_room":
        return t("descriptions.byRoom");
      case "multi_rooms":
        return t("descriptions.multiRooms");
    }
  };

  const renderByDateContent = () => {
    const showEmpty = !selectedDate || roomsForDate.length === 0;

    return (
      <div className="space-y-6">
        <h2 className="text-center text-2xl font-bold text-on-surface">{t("sections.selectDate")}</h2>

        <div className="flex justify-center">
          <BookingDatePicker
            isOpen={isCalendarOpen}
            onChange={handleDateChange}
            onOpenChange={setIsCalendarOpen}
            value={selectedDate}
          />
        </div>

        {showEmpty ? (
          <EmptyResultsPanel />
        ) : (
          <div className="space-y-4">
            {roomsForDate.map((room) => (
              <RoomResultCard
                key={room.id}
                onOpenGallery={setGalleryRoom}
                onSelectTime={(resultRoom) => handleStubAction("select_time", resultRoom)}
                room={room}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderByRoomContent = () => (
    <div className="space-y-6">
      <h2 className="text-center text-2xl font-bold text-on-surface">{t("sections.availableRooms")}</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {allRooms.map((room) => (
          <RoomGridCard
            key={room.id}
            onOpenGallery={setGalleryRoom}
            onSeeAvailability={(selectedRoom) => handleStubAction("see_availability", selectedRoom)}
            room={room}
            variant="by_room"
          />
        ))}
      </div>
    </div>
  );

  const renderMultiRoomsContent = () => (
    <div className="space-y-6">
      <h2 className="text-center text-2xl font-bold text-on-surface">{t("sections.selectRooms")}</h2>

      <RoomSelectionBar
        onSeeAvailability={() => handleStubAction("multi_see_availability")}
        selectedRooms={selectedRooms}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {allRooms.map((room) => (
          <RoomGridCard
            key={room.id}
            isSelected={selectedRoomIds.includes(room.id)}
            onOpenGallery={setGalleryRoom}
            onToggleSelect={handleToggleRoomSelection}
            room={room}
            variant="multi_room"
          />
        ))}
      </div>
    </div>
  );

  const renderModeContent = () => {
    switch (bookingMode) {
      case "by_date":
        return renderByDateContent();
      case "by_room":
        return renderByRoomContent();
      case "multi_rooms":
        return renderMultiRoomsContent();
    }
  };

  return (
    <>
      <BookingHero />

      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <BookingModeTabs activeMode={bookingMode} onModeChange={handleModeChange} />

          <p className="whitespace-pre-line text-center text-sm font-medium text-on-surface">{modeDescription()}</p>
        </div>

        <div className="mt-7">{renderModeContent()}</div>
      </main>

      <RoomGalleryModal
        images={galleryRoom?.galleryImages ?? []}
        isOpen={galleryRoom !== null}
        onClose={() => setGalleryRoom(null)}
      />
    </>
  );
};

export default FindSpacePage;
