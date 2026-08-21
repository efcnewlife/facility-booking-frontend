import BookingHero from "@/components/booking/BookingHero";
import EmptyResultsPanel from "@/components/booking/EmptyResultsPanel";
import RoomResultCard from "@/components/booking/RoomResultCard";
import facilityService from "@/api/services/facilityService";
import type { RoomAvailability, TimeSlot } from "@/types/booking";
import { parseRoomsSearchQuery, toRoomsSearchParams } from "@/utils/startBookingFlow";
import { filterRoomsByCriteria } from "@/utils/roomAvailabilityFilter";
import { Button, Input, cn } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdArrowBack, MdCheckCircle } from "react-icons/md";
import { Navigate, useNavigate, useSearchParams } from "react-router";

const MAX_ROOMS_PER_BOOKING = 3;

interface SelectedRoomSlot {
  room: RoomAvailability;
  slot: TimeSlot;
  period: "am" | "pm";
}

const parsePositiveInt = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const combineDateAndTime = (date: string, time: string): string => {
  return moment(`${date} ${time}`, "YYYY-MM-DD HH:mm").toISOString();
};

const RoomFilterPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = parseRoomsSearchQuery(searchParams);

  const [date, setDate] = useState(initialQuery?.date || "");
  const [capacityInput, setCapacityInput] = useState(searchParams.get("capacity") || "");
  const [minHoursInput, setMinHoursInput] = useState(searchParams.get("minHours") || "");
  const [ministryId] = useState(initialQuery?.ministryId ?? null);
  const [isMultiRoom] = useState((initialQuery?.space ?? "single") === "multiple");

  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<SelectedRoomSlot[]>([]);
  const [confirming, setConfirming] = useState(false);

  const appliedCapacity = parsePositiveInt(capacityInput);
  const appliedMinHours = parsePositiveInt(minHoursInput);

  const filteredRooms = useMemo(
    () => filterRoomsByCriteria(rooms, appliedCapacity, appliedMinHours),
    [appliedCapacity, appliedMinHours, rooms]
  );

  const formattedDate = useMemo(() => {
    if (!date) {
      return "";
    }
    return moment(date).locale(i18nInstance.language).format("ddd, MMM D, YYYY");
  }, [date, i18nInstance.language]);

  const loadAvailability = useCallback(async () => {
    if (!date) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await facilityService.getAvailability(date, ministryId);
      setRooms(items);
      setSelectedSlots([]);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("wizard.errors.loadAvailability"));
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [date, ministryId, t]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  if (!initialQuery?.date) {
    return <Navigate replace to="/" />;
  }

  const syncQuery = (nextDate: string, capacity: number | null, minHours: number | null) => {
    const next = toRoomsSearchParams({
      date: nextDate,
      start: initialQuery.start,
      end: initialQuery.end,
      space: initialQuery.space,
      ministryId: initialQuery.ministryId,
      room: initialQuery.room,
    });
    if (capacity) {
      next.set("capacity", String(capacity));
    }
    if (minHours) {
      next.set("minHours", String(minHours));
    }
    setSearchParams(next, { replace: true });
  };

  const handleApplyFilters = () => {
    if (!moment(date, "YYYY-MM-DD", true).isValid()) {
      setError(t("wizard.selectDate.title"));
      return;
    }
    syncQuery(date, appliedCapacity, appliedMinHours);
    void loadAvailability();
  };

  const handleSelectSlot = (room: RoomAvailability, slot: TimeSlot, period: "am" | "pm") => {
    setSuccessMessage(null);
    setError(null);

    if (!isMultiRoom) {
      setSelectedSlots([{ room, slot, period }]);
      setConfirming(true);
      return;
    }

    setSelectedSlots((prev) => {
      const withoutRoom = prev.filter((item) => item.room.id !== room.id);
      if (prev.some((item) => item.room.id === room.id)) {
        return [...withoutRoom, { room, slot, period }];
      }
      if (withoutRoom.length >= MAX_ROOMS_PER_BOOKING) {
        setError(t("wizard.roomFilter.maxRooms", { max: MAX_ROOMS_PER_BOOKING }));
        return prev;
      }
      return [...withoutRoom, { room, slot, period }];
    });
    setConfirming(false);
  };

  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0 || !date) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const starts = selectedSlots.map((item) => combineDateAndTime(date, item.slot.start));
      const ends = selectedSlots.map((item) => combineDateAndTime(date, item.slot.end));
      const startAt = starts.reduce((min, value) => (value < min ? value : min));
      const endAt = ends.reduce((max, value) => (value > max ? value : max));

      await facilityService.createBooking({
        startAt,
        endAt,
        ministryId: ministryId || null,
        rooms: selectedSlots.map((item, index) => ({
          facilityId: item.room.id,
          startAt: combineDateAndTime(date, item.slot.start),
          endAt: combineDateAndTime(date, item.slot.end),
          sequence: index,
        })),
      });
      setSuccessMessage(t("wizard.confirm.success"));
      setSelectedSlots([]);
      setConfirming(false);
      await loadAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("wizard.errors.createBooking"));
    } finally {
      setLoading(false);
    }
  };

  const showStickyBar = isMultiRoom && selectedSlots.length > 0 && !confirming;

  return (
    <>
      <BookingHero titleKey="wizard.roomFilter.title" />

      <main className={cn("mx-auto w-full max-w-[960px] flex-1 px-4 py-6 sm:px-6 lg:px-8", showStickyBar && "pb-28")}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            onClick={() => navigate("/")}
            type="button"
          >
            <MdArrowBack className="size-4" />
            {t("wizard.roomFilter.backToWizard")}
          </button>
          {formattedDate ? <p className="text-sm font-medium text-on-surface-variant">{formattedDate}</p> : null}
        </div>

        <section className="mb-6 rounded-[16px] bg-surface p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-base font-bold text-on-surface">{t("wizard.roomFilter.filtersHeading")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <Input
              id="filter-date"
              label={t("wizard.roomFilter.filters.date")}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
            <Input
              id="filter-capacity"
              label={t("wizard.roomFilter.filters.capacity")}
              min={1}
              onChange={(event) => setCapacityInput(event.target.value)}
              type="number"
              value={capacityInput}
            />
            <Input
              id="filter-min-hours"
              label={t("wizard.roomFilter.filters.minHours")}
              min={1}
              onChange={(event) => setMinHoursInput(event.target.value)}
              type="number"
              value={minHoursInput}
            />
            <Button className="w-full lg:min-w-[140px]" onClick={handleApplyFilters} size="sm" variant="primary">
              {t("wizard.roomFilter.filters.apply")}
            </Button>
          </div>
        </section>

        {error ? (
          <div className="mb-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <MdCheckCircle className="size-5 shrink-0" />
            {successMessage}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-on-surface">{t("sections.availableRooms")}</h2>
            {isMultiRoom ? (
              <p className="mt-1 text-sm text-on-surface-variant">{t("wizard.roomFilter.selectSlotHint")}</p>
            ) : null}
          </div>
          {!loading ? (
            <p className="text-sm font-medium text-on-surface-variant">
              {t("wizard.roomFilter.resultsCount", { count: filteredRooms.length })}
            </p>
          ) : null}
        </div>

        {loading && rooms.length === 0 ? (
          <p className="py-12 text-center text-on-surface-variant">{t("wizard.loading")}</p>
        ) : null}
        {!loading && filteredRooms.length === 0 ? <EmptyResultsPanel /> : null}

        <div className="space-y-4">
          {filteredRooms.map((room) => {
            const selected = selectedSlots.find((item) => item.room.id === room.id);
            return (
              <RoomResultCard
                key={room.id}
                isSelected={Boolean(selected)}
                onSelectSlot={handleSelectSlot}
                room={room}
                selectedLabel={selected ? `${selected.slot.start} – ${selected.slot.end}` : undefined}
              />
            );
          })}
        </div>

        {confirming && selectedSlots.length > 0 ? (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div className="w-full max-w-md space-y-4 rounded-[16px] bg-surface p-5 shadow-xl sm:p-6" role="dialog">
              <h2 className="text-center text-xl font-bold text-on-surface">{t("wizard.confirm.title")}</h2>
              <div className="space-y-3 rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface">
                <p>
                  <span className="font-medium text-on-surface-variant">{t("wizard.confirm.date")}: </span>
                  {formattedDate}
                </p>
                <ul className="divide-y divide-outline-variant">
                  {selectedSlots.map((item) => (
                    <li className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0" key={item.room.id}>
                      <span className="font-bold">{item.room.name}</span>
                      <span className="shrink-0 text-on-surface-variant">
                        {item.slot.start} – {item.slot.end}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button onClick={() => setConfirming(false)} size="sm" variant="outline">
                  {t("wizard.back")}
                </Button>
                <Button disabled={loading} onClick={() => void handleConfirmBooking()} size="sm" variant="primary">
                  {t("wizard.confirm.submit")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {showStickyBar ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-[960px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface">
                {t("wizard.roomFilter.selectedRooms", {
                  count: selectedSlots.length,
                  max: MAX_ROOMS_PER_BOOKING,
                })}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {selectedSlots.map((item) => (
                  <span
                    className="inline-flex max-w-full truncate rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    key={item.room.id}
                  >
                    {item.room.name}: {item.slot.start}–{item.slot.end}
                  </span>
                ))}
              </div>
            </div>
            <Button
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setConfirming(true)}
              size="sm"
              variant="primary"
            >
              {t("wizard.roomFilter.confirmSelection")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default RoomFilterPage;
