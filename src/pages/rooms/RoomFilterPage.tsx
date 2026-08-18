import facilityService from "@/api/services/facilityService";
import ministryService from "@/api/services/ministryService";
import type { MinistryItem } from "@/types/ministry";
import {
  isWhenValid,
  parseRoomsSearchQuery,
  toRoomsSearchParams,
  type RoomShortcutCode,
  type RoomsSearchQuery,
  type RoomsSpace,
} from "@/utils/startBookingFlow";
import {
  SLOT_MINUTES,
  bookRoom,
  canReviewBooking,
  clearUnconfirmedSelection,
  clockToMinutes,
  contiguousBlocks,
  hasNoMatchingResults,
  isBookableCell,
  minutesToClock,
  removeSelectedRoom,
  visibleRooms,
  type CapacityBand,
  type CellState,
  type RoomDay,
  type TimetableSelection,
  type TimetableView,
} from "@/utils/timetableRules";
import { Alert, Button, Input, Select, cn } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdArrowBack, MdArrowForward, MdCheckCircle, MdGroup } from "react-icons/md";
import { Navigate, useSearchParams } from "react-router";

const ROOMS_PER_PAGE = 4;
const CELL_HEIGHT_PX = 30;
const TIME_GUTTER_PX = 88;
const ROOM_COL_PX = 220;
const CAPACITY_BANDS: CapacityBand[] = ["1-10", "10-25", "25-50", "50+"];

const isActiveMinistry = (item: MinistryItem): boolean => {
  return item.status === "active" && item.isActive !== false;
};

const combineDateAndTime = (date: string, time: string): string => {
  const clock = time === "24:00" ? "00:00" : time;
  const day = time === "24:00" ? moment(date, "YYYY-MM-DD").add(1, "day") : moment(date, "YYYY-MM-DD");
  return moment(`${day.format("YYYY-MM-DD")} ${clock}`, "YYYY-MM-DD HH:mm").toISOString();
};

const formatClock = (clock: string, locale: string): string => {
  if (clock === "24:00") {
    return moment("00:00", "HH:mm").locale(locale).format("h:mm a");
  }
  return moment(clock, "HH:mm").locale(locale).format("h:mm a");
};

const hourLabels = Array.from({ length: 24 }, (_, hour) => minutesToClock(hour * 60));

const stateClassName = (state: CellState): string => {
  switch (state) {
    case "available":
      return "border-l-[5px] border-[#389b2d] bg-[#d1f2cd] text-booking-primary";
    case "unavailable":
      return "border-l-[5px] border-[#7b7b7b] bg-[#d8d8d8] text-white";
    case "override":
      return "border-l-[5px] border-[#d91268] bg-[#ffe5e7] text-booking-primary";
    case "closed":
      return "bg-[#e4e4e4]";
  }
};

const RoomFilterPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = parseRoomsSearchQuery(searchParams);

  const [draftDate, setDraftDate] = useState(initialQuery?.date ?? "");
  const [draftStart, setDraftStart] = useState(initialQuery?.start ?? "");
  const [draftEnd, setDraftEnd] = useState(initialQuery?.end ?? "");
  const [draftSpace, setDraftSpace] = useState<RoomsSpace>(initialQuery?.space ?? "single");
  const [draftRoom, setDraftRoom] = useState<RoomShortcutCode | "">(initialQuery?.room ?? "");
  const [draftMinistryId, setDraftMinistryId] = useState(initialQuery?.ministryId ?? "");
  const [view, setView] = useState<TimetableView>("available");
  const [capacityBand, setCapacityBand] = useState<CapacityBand | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [rooms, setRooms] = useState<RoomDay[]>([]);
  const [bookableMinistries, setBookableMinistries] = useState<MinistryItem[]>([]);
  const [selection, setSelection] = useState<TimetableSelection>({
    roomIds: [],
    interval: initialQuery?.start && initialQuery?.end ? { start: initialQuery.start, end: initialQuery.end } : null,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const appliedQuery = initialQuery;
  const appliedDate = appliedQuery?.date ?? "";
  const appliedMinistryId = appliedQuery?.ministryId;
  const appliedSpace = appliedQuery?.space ?? "single";
  const appliedRoom = appliedQuery?.room;
  const showMinistryField = bookableMinistries.length > 0;

  const loadAvailability = useCallback(async () => {
    if (!appliedDate) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await facilityService.getAvailability(appliedDate, appliedMinistryId);
      setRooms(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("timetable.loadError"));
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [appliedDate, appliedMinistryId, t]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    let cancelled = false;
    const loadMinistries = async () => {
      try {
        const result = await ministryService.listMine(true);
        if (!cancelled) {
          setBookableMinistries((result.items || []).filter(isActiveMinistry));
        }
      } catch {
        if (!cancelled) {
          setBookableMinistries([]);
        }
      }
    };
    void loadMinistries();
    return () => {
      cancelled = true;
    };
  }, []);

  const listedRooms = useMemo(
    () => visibleRooms(rooms, view, selection.interval, capacityBand, appliedRoom),
    [appliedRoom, capacityBand, rooms, selection.interval, view],
  );
  const noMatching = hasNoMatchingResults(rooms, view, selection.interval, capacityBand, appliedRoom);
  const pageCount = Math.max(1, Math.ceil(listedRooms.length / ROOMS_PER_PAGE));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const pagedRooms = listedRooms.slice(safePage * ROOMS_PER_PAGE, safePage * ROOMS_PER_PAGE + ROOMS_PER_PAGE);
  const selectedFromAll = rooms.filter((room) => selection.roomIds.includes(room.id));

  useEffect(() => {
    setPageIndex(0);
  }, [view, capacityBand, appliedRoom, appliedDate, listedRooms.length]);

  if (!appliedQuery?.date) {
    return <Navigate replace to="/" />;
  }

  const halfFilledTime = Boolean(draftStart) !== Boolean(draftEnd);

  const handleUpdateSearch = () => {
    if (!moment(draftDate, "YYYY-MM-DD", true).isValid()) {
      setError(t("timetable.date"));
      return;
    }
    if (halfFilledTime) {
      setError(t("timetable.halfFilledTime"));
      return;
    }
    if (!isWhenValid({ date: draftDate, start: draftStart || null, end: draftEnd || null }, new Date())) {
      setError(t("timetable.whenInvalid"));
      return;
    }
    const next: RoomsSearchQuery = {
      date: draftDate,
      space: draftSpace,
    };
    if (draftStart && draftEnd) {
      next.start = draftStart;
      next.end = draftEnd;
    }
    if (draftMinistryId) {
      next.ministryId = draftMinistryId;
    }
    if (draftRoom) {
      next.room = draftRoom;
    }
    setSearchParams(toRoomsSearchParams(next), { replace: true });
    setSelection(
      clearUnconfirmedSelection({
        roomIds: selection.roomIds,
        interval: draftStart && draftEnd ? { start: draftStart, end: draftEnd } : null,
      }),
    );
    setDetailsOpen(false);
    setSuccessMessage(null);
    setError(null);
  };

  const handleBook = (room: RoomDay, cellStart: string) => {
    if (!isBookableCell(room, cellStart, selection.interval)) {
      return;
    }
    const next = bookRoom(selection, room, cellStart, appliedSpace);
    setSelection(next);
    if (next.interval) {
      setDraftStart(next.interval.start);
      setDraftEnd(next.interval.end);
    }
    setSuccessMessage(null);
  };

  const handleRemoveRoom = (roomId: string) => {
    const next = removeSelectedRoom(selection, roomId);
    setSelection(next);
    if (next.roomIds.length === 0) {
      setDetailsOpen(false);
    }
  };

  const handleConfirm = async () => {
    if (!canReviewBooking(selection) || !selection.interval || !appliedDate) {
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const startAt = combineDateAndTime(appliedDate, selection.interval.start);
      const endAt = combineDateAndTime(appliedDate, selection.interval.end);
      await facilityService.createBooking({
        startAt,
        endAt,
        ministryId: appliedMinistryId || null,
        rooms: selection.roomIds.map((facilityId, index) => ({
          facilityId,
          startAt,
          endAt,
          sequence: index,
        })),
      });
      setSuccessMessage(t("timetable.success"));
      setSelection({ roomIds: [], interval: selection.interval });
      setDetailsOpen(false);
      await loadAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("timetable.createError"));
    } finally {
      setConfirming(false);
    }
  };

  const formattedDate = moment(appliedDate).locale(i18nInstance.language).format("dddd, MMMM D, YYYY");
  const formattedInterval = selection.interval
    ? `${formatClock(selection.interval.start, i18nInstance.language)} – ${formatClock(selection.interval.end, i18nInstance.language)}`
    : "";

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 py-6 sm:px-6">
      <form
        aria-label={t("timetable.searchBar")}
        className="flex flex-col gap-4 rounded-[16px] bg-surface p-4 shadow-sm lg:flex-row lg:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          handleUpdateSearch();
        }}
      >
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {showMinistryField ? (
            <Select
              id="timetable-ministry"
              label={t("timetable.ministry")}
              onChange={(value) => setDraftMinistryId(typeof value === "string" ? value : "")}
              options={[
                { value: "", label: t("timetable.ministryNone") },
                ...bookableMinistries.map((ministry) => ({
                  value: ministry.id,
                  label: ministry.name || ministry.id,
                })),
              ]}
              value={draftMinistryId}
            />
          ) : null}
          <Input id="timetable-date" label={t("timetable.date")} onChange={(event) => setDraftDate(event.target.value)} type="date" value={draftDate} />
          <Select
            disabled
            id="timetable-repetition"
            label={t("timetable.repetition")}
            options={[{ value: "one_time", label: t("timetable.oneTime") }]}
            value="one_time"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input id="timetable-start" label={t("timetable.start")} onChange={(event) => setDraftStart(event.target.value)} type="time" value={draftStart} />
            <Input id="timetable-end" label={t("timetable.end")} onChange={(event) => setDraftEnd(event.target.value)} type="time" value={draftEnd} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              id="timetable-space"
              label={t("timetable.roomsCount")}
              onChange={(value) => setDraftSpace(value === "multiple" ? "multiple" : "single")}
              options={[
                { value: "single", label: t("timetable.singleRoom") },
                { value: "multiple", label: t("timetable.multipleRooms") },
              ]}
              value={draftSpace}
            />
            <Select
              id="timetable-room"
              label={t("timetable.roomShortcut")}
              onChange={(value) => setDraftRoom(value === "gym" || value === "sanctuary-hall" ? value : "")}
              options={[
                { value: "", label: t("timetable.roomAny") },
                { value: "gym", label: t("timetable.gym") },
                { value: "sanctuary-hall", label: t("timetable.sanctuary") },
              ]}
              value={draftRoom}
            />
          </div>
        </div>
        <Button onClick={handleUpdateSearch} size="sm" variant="primary">
          {t("timetable.updateSearch")}
        </Button>
      </form>

      {error ? (
        <div className="mt-4">
          <Alert message={error} title={t("startBooking.errors.title")} variant="error" width="full" />
        </div>
      ) : null}
      {successMessage ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <MdCheckCircle className="size-5 shrink-0" />
          {successMessage}
        </div>
      ) : null}

      <section className="mt-6 rounded-[16px] bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-on-surface">{t("timetable.filterByView")}</span>
              {(["available", "all"] as TimetableView[]).map((option) => (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-semibold",
                    view === option ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface",
                  )}
                  key={option}
                  onClick={() => setView(option)}
                  type="button"
                >
                  {option === "available" ? t("timetable.availableRooms") : t("timetable.allRooms")}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-on-surface">{t("timetable.filterByCapacity")}</span>
              {CAPACITY_BANDS.map((band) => (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-semibold",
                    capacityBand === band ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface",
                  )}
                  key={band}
                  onClick={() => setCapacityBand((current) => (current === band ? null : band))}
                  type="button"
                >
                  {band === "1-10"
                    ? t("timetable.capacity1to10")
                    : band === "10-25"
                      ? t("timetable.capacity10to25")
                      : band === "25-50"
                        ? t("timetable.capacity25to50")
                        : t("timetable.capacity50plus")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              aria-label={t("timetable.previousRooms")}
              className="flex size-[30px] items-center justify-center rounded-[3px] bg-primary text-on-primary disabled:bg-[#e4e4e4]"
              disabled={safePage === 0}
              onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
              type="button"
            >
              <MdArrowBack className="size-4" />
            </button>
            <button
              aria-label={t("timetable.nextRooms")}
              className="flex size-[30px] items-center justify-center rounded-[3px] bg-primary text-on-primary disabled:bg-[#e4e4e4]"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
              type="button"
            >
              <MdArrowForward className="size-4" />
            </button>
          </div>
        </div>

        {loading && rooms.length === 0 ? <p className="py-12 text-center text-on-surface-variant">{t("startBooking.loading")}</p> : null}

        <div className="mt-6 overflow-x-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `${TIME_GUTTER_PX}px repeat(${Math.max(pagedRooms.length, 1)}, ${ROOM_COL_PX}px)`,
              columnGap: 24,
            }}
          >
            <div />
            {pagedRooms.map((room) => (
              <article className="overflow-hidden bg-booking-primary text-white" key={room.id}>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-base font-bold">{room.name}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    <MdGroup className="size-4" />
                    {t("timetable.capacity", { count: room.capacity })}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {noMatching && view === "available" ? (
            <div className="mt-4 flex h-[168px] items-center justify-center bg-[#d8d8d8] text-base font-bold text-[#7b7b7b]">
              {t("timetable.noMatchingResults")}
            </div>
          ) : (
            <div className="relative mt-4 max-h-[720px] overflow-y-auto border-t-4 border-booking-primary pt-4">
              <div
                className="relative grid"
                style={{
                  gridTemplateColumns: `${TIME_GUTTER_PX}px repeat(${Math.max(pagedRooms.length, 1)}, ${ROOM_COL_PX}px)`,
                  gridTemplateRows: `repeat(48, ${CELL_HEIGHT_PX}px)`,
                  columnGap: 24,
                }}
              >
                {hourLabels.map((label, hour) => (
                  <div
                    className="flex translate-y-[-50%] items-center justify-end pr-3 text-xs font-medium text-booking-primary"
                    key={label}
                    style={{ gridColumn: 1, gridRow: hour * 2 + 1 }}
                  >
                    {formatClock(label, i18nInstance.language)}
                  </div>
                ))}
                {pagedRooms.map((room, roomIndex) =>
                  room.cells.map((cell, cellIndex) => {
                    const bookable = isBookableCell(room, cell.start, selection.interval);
                    const selected =
                      selection.roomIds.includes(room.id) &&
                      selection.interval &&
                      clockToMinutes(cell.start) >= clockToMinutes(selection.interval.start) &&
                      clockToMinutes(cell.start) < clockToMinutes(selection.interval.end);
                    return (
                      <button
                        className={cn(
                          "relative w-full border-t border-[#cfcfcf] text-left",
                          cellIndex % 2 === 0 && "border-[#9a9a9a]",
                          cell.state === "closed" && "bg-[#e4e4e4]",
                          bookable && "cursor-pointer",
                          selected && "ring-1 ring-primary",
                        )}
                        disabled={!bookable}
                        key={`${room.id}-${cell.start}`}
                        onClick={() => handleBook(room, cell.start)}
                        style={{ gridColumn: roomIndex + 2, gridRow: cellIndex + 1 }}
                        type="button"
                      />
                    );
                  }),
                )}
                {pagedRooms.map((room, roomIndex) =>
                  contiguousBlocks(room)
                    .filter((block) => block.state !== "closed")
                    .map((block) => {
                      const startRow = clockToMinutes(block.start) / SLOT_MINUTES + 1;
                      const endRow = clockToMinutes(block.end) / SLOT_MINUTES + 1;
                      const bookableStart = isBookableCell(room, block.start, selection.interval);
                      return (
                        <article
                          className={cn(
                            "pointer-events-none z-[1] flex items-start justify-between overflow-hidden px-3 py-2",
                            stateClassName(block.state),
                          )}
                          key={`${room.id}-${block.start}-${block.state}`}
                          style={{ gridColumn: roomIndex + 2, gridRow: `${startRow} / ${endRow}` }}
                        >
                          <div>
                            <p className="text-base font-bold leading-tight">{t(`timetable.${block.state}`)}</p>
                            <p className="mt-1 text-xs font-medium">
                              {formatClock(block.start, i18nInstance.language)} – {formatClock(block.end, i18nInstance.language)}
                            </p>
                          </div>
                          {block.state === "available" && bookableStart ? (
                            <span className="rounded-full bg-booking-yellow px-3 py-1 text-xs font-bold text-booking-primary">
                              {t("timetable.book")}
                            </span>
                          ) : null}
                        </article>
                      );
                    }),
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button disabled={!canReviewBooking(selection)} onClick={() => setDetailsOpen(true)} size="sm" variant="primary">
            {appliedSpace === "multiple"
              ? t("timetable.reviewBookingCount", { count: selection.roomIds.length })
              : t("timetable.reviewBooking")}
          </Button>
        </div>
      </section>

      {detailsOpen && canReviewBooking(selection) ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-xl rounded-[20px] bg-[#e8eef4] p-6 shadow-xl" role="dialog">
            <h2 className="text-2xl font-semibold text-booking-primary">{t("bookingDetails.title")}</h2>
            <dl className="mt-6 space-y-4 text-booking-primary">
              <div>
                <dt className="text-sm font-medium text-on-surface-variant">{t("bookingDetails.date")}</dt>
                <dd className="text-base font-semibold">{formattedDate}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-on-surface-variant">{t("bookingDetails.repetition")}</dt>
                <dd className="text-base font-semibold">{t("bookingDetails.oneTime")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-on-surface-variant">{t("bookingDetails.time")}</dt>
                <dd className="text-base font-semibold">{formattedInterval}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-on-surface-variant">{t("bookingDetails.space")}</dt>
                <dd className="space-y-3">
                  {selectedFromAll.map((room) => (
                    <div className="flex items-center justify-between gap-3" key={room.id}>
                      <span className="font-bold">{room.name}</span>
                      <span className="flex gap-3 text-sm font-semibold text-primary">
                        <button onClick={() => setDetailsOpen(false)} type="button">
                          {t("bookingDetails.edit")}
                        </button>
                        <button onClick={() => handleRemoveRoom(room.id)} type="button">
                          {t("bookingDetails.remove")}
                        </button>
                      </span>
                    </div>
                  ))}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <Button disabled={confirming} onClick={() => void handleConfirm()} size="sm" variant="primary">
                {t("bookingDetails.confirm")}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
};

export default RoomFilterPage;
