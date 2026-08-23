import facilityService from "@/api/services/facilityService";
import ministryService from "@/api/services/ministryService";
import type { MinistryItem } from "@/types/ministry";
import {
  isWhenValid,
  parseBookingDetailsQuery,
  parseRoomsSearchQuery,
  toBookingDetailsSearchParams,
  toRoomsSearchParams,
  type RoomsSearchQuery,
  type RoomsSpace,
} from "@/utils/startBookingFlow";
import {
  bookRoom,
  canReviewBooking,
  clearUnconfirmedSelection,
  clockToMinutes,
  displayBlocks,
  emptyTimeBookInterval,
  emptyTimePointerAction,
  hasNoMatchingResults,
  isBookableCell,
  minutesToClock,
  SLOT_MINUTES,
  visibleRooms,
  type CapacityBand,
  type CellState,
  type HoverPreview,
  type PointerKind,
  type RoomDay,
  type TimetableSelection,
  type TimetableView,
} from "@/utils/timetableRules";
import {
  Alert,
  Badge,
  Button,
  cn,
  DatePicker,
  Select,
  Spinner,
  TimePicker,
  type DatePickerValue,
  type TimePickerValue,
} from "@efcnewlife/newlife-ui";
import dayjs from "dayjs";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdArrowBack, MdArrowForward } from "react-icons/md";
import { Navigate, useNavigate, useSearchParams } from "react-router";

const ROOMS_PER_PAGE = 4;
const CAPACITY_BANDS: CapacityBand[] = ["1-10", "10-25", "25-50", "50+"];
const SEARCH_LABEL_CLASS = "mb-[3px] text-xs font-medium leading-none text-inverse-on-surface";
const TIMETABLE_TRACK = "grid w-full grid-cols-[88px_repeat(4,minmax(0,1fr))] gap-x-[30px]";

const isActiveMinistry = (item: MinistryItem): boolean => {
  return item.status === "active" && item.isActive !== false;
};

const formatClock = (clock: string, locale: string): string => {
  if (clock === "24:00") {
    return moment("00:00", "HH:mm").locale(locale).format("h:mm a");
  }
  return moment(clock, "HH:mm").locale(locale).format("h:mm a");
};

const hourLabels = Array.from({ length: 24 }, (_, hour) => minutesToClock(hour * 60));

const TIME_OF_DAY_ANCHOR = "1970-01-01";

const toTimePickerValue = (clock: string): TimePickerValue => {
  if (!clock || clock === "24:00") {
    return null;
  }
  const parsed = dayjs(`${TIME_OF_DAY_ANCHOR}T${clock}:00`);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed;
};

const fromTimePickerValue = (value: TimePickerValue): string => {
  if (!value || !value.isValid()) {
    return "";
  }
  return value.format("HH:mm");
};

const toDatePickerValue = (date: string): DatePickerValue => {
  if (!date) {
    return null;
  }
  const parsed = dayjs(date);
  if (!parsed.isValid() || parsed.format("YYYY-MM-DD") !== date) {
    return null;
  }
  return parsed;
};

const fromDatePickerValue = (value: DatePickerValue): string => {
  if (!value || !value.isValid()) {
    return "";
  }
  return value.format("YYYY-MM-DD");
};

const eventClassName = (state: CellState): string => {
  return cn(
    "pointer-events-none z-[1] flex min-h-0 items-start justify-between overflow-hidden border-l-[5px] py-2.5 pr-2.5 pl-[18px]",
    state === "available" && "border-l-booking-green bg-success-container text-booking-primary",
    state === "unavailable" && "border-l-gray-500 bg-gray-300 text-white",
    state === "override" && "border-l-error bg-error-container text-booking-primary"
  );
};

const CapacityIcon = () => (
  <svg aria-hidden fill="none" height="11" viewBox="0 0 18 11" width="18" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M0 11V9.35C0 8.59375 0.45 7.975 1.275 7.49375C2.1 7.0125 3.225 6.80625 4.575 6.80625C5.925 6.80625 5.025 6.80625 5.325 6.80625C5.625 6.80625 6.375 6.875 6.75 7.08125C6.3 7.2875 5.325 8.18125 5.325 9.28125V11H0ZM6 11V9.4875C6 9.00625 6.15 8.525 6.45 8.1125C6.75 7.7 7.125 7.35625 7.725 7.08125C8.325 6.80625 8.925 6.53125 9.675 6.39375C10.425 6.25625 11.25 6.1875 12.075 6.1875C12.9 6.1875 13.8 6.25625 14.475 6.39375C15.15 6.53125 15.825 6.80625 16.35 7.08125C16.875 7.35625 17.325 7.76875 17.55 8.1125C17.775 8.45625 18 8.9375 18 9.4875V11H6ZM4.575 5.775C3.975 5.775 3.375 5.56875 2.925 5.15625C2.475 4.74375 2.25 4.2625 2.25 3.64375C2.25 3.025 2.475 2.54375 2.925 2.13125C3.375 1.71875 3.9 1.5125 4.575 1.5125C5.25 1.5125 5.775 1.71875 6.225 2.13125C6.675 2.54375 6.9 3.025 6.9 3.64375C6.9 4.2625 6.675 4.74375 6.225 5.15625C5.775 5.56875 5.25 5.775 4.575 5.775ZM12 5.5C11.175 5.5 10.425 5.225 9.9 4.675C9.3 4.125 9 3.50625 9 2.75C9 1.99375 9.3 1.30625 9.9 0.75625C10.5 0.20625 11.175 0 12 0C12.825 0 13.575 0.275 14.175 0.75625C14.775 1.2375 15 1.925 15 2.75C15 3.575 14.7 4.19375 14.175 4.675C13.575 5.225 12.9 5.5 12 5.5Z"
      fill="#DFEDFF"
    />
  </svg>
);

const RoomFilterPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = parseRoomsSearchQuery(searchParams);
  const initialDetails = parseBookingDetailsQuery(searchParams);

  const [draftDate, setDraftDate] = useState(initialQuery?.date ?? "");
  const [draftStart, setDraftStart] = useState(initialQuery?.start ?? "");
  const [draftEnd, setDraftEnd] = useState(initialQuery?.end ?? "");
  const [draftSpace, setDraftSpace] = useState<RoomsSpace>(initialQuery?.space ?? "single");
  const [draftMinistryId, setDraftMinistryId] = useState(initialQuery?.ministryId ?? "");
  const [view, setView] = useState<TimetableView>("available");
  const [capacityBand, setCapacityBand] = useState<CapacityBand | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [rooms, setRooms] = useState<RoomDay[]>([]);
  const [bookableMinistries, setBookableMinistries] = useState<MinistryItem[]>([]);
  const [selection, setSelection] = useState<TimetableSelection>({
    roomIds: initialDetails?.roomIds ?? [],
    interval:
      initialDetails != null
        ? { start: initialDetails.start, end: initialDetails.end }
        : initialQuery?.start && initialQuery?.end
          ? { start: initialQuery.start, end: initialQuery.end }
          : null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverPreview | null>(null);

  const appliedQuery = initialQuery;
  const appliedDate = appliedQuery?.date ?? "";
  const appliedMinistryId = appliedQuery?.ministryId;
  const appliedSpace = appliedQuery?.space ?? "single";
  const appliedRoom = appliedQuery?.room;
  const showMinistryField = bookableMinistries.length > 0;
  const minDate = moment().format("YYYY-MM-DD");
  const maxDate = moment().add(1, "year").format("YYYY-MM-DD");
  const selectLabels = {
    selectPlaceholder: t("selectPlaceholder", { ns: "common" }),
    clearSelection: t("clearSelection", { ns: "common" }),
    toggleOptions: t("toggleOptions", { ns: "common" }),
    searchOptions: t("searchOptions", { ns: "common" }),
    noOptions: t("noOptions", { ns: "common" }),
  };

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
    [appliedRoom, capacityBand, rooms, selection.interval, view]
  );
  const noMatching = hasNoMatchingResults(rooms, view, selection.interval, capacityBand, appliedRoom);
  const pageCount = Math.max(1, Math.ceil(listedRooms.length / ROOMS_PER_PAGE));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const pagedRooms = listedRooms.slice(safePage * ROOMS_PER_PAGE, safePage * ROOMS_PER_PAGE + ROOMS_PER_PAGE);
  const paddedRooms: Array<RoomDay | null> = [
    ...pagedRooms,
    ...Array.from({ length: Math.max(0, ROOMS_PER_PAGE - pagedRooms.length) }, () => null),
  ];

  useEffect(() => {
    setPageIndex(0);
  }, [view, capacityBand, appliedRoom, appliedDate, listedRooms.length]);

  const handleUpdateSearch = useCallback(() => {
    if (!moment(draftDate, "YYYY-MM-DD", true).isValid()) {
      setError(t("timetable.date"));
      return;
    }
    if (Boolean(draftStart) !== Boolean(draftEnd)) {
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
    if (appliedRoom) {
      next.room = appliedRoom;
    }
    setSearchParams(toRoomsSearchParams(next), { replace: true });
    setHover(null);
    setSelection(
      clearUnconfirmedSelection({
        roomIds: selection.roomIds,
        interval: draftStart && draftEnd ? { start: draftStart, end: draftEnd } : null,
      })
    );
    setError(null);
  }, [
    appliedRoom,
    draftDate,
    draftEnd,
    draftMinistryId,
    draftSpace,
    draftStart,
    selection.roomIds,
    setSearchParams,
    t,
  ]);

  useEffect(() => {
    const on_pointer_down = (event: PointerEvent) => {
      const target = event.target;
      const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
      if (!element?.closest("#timetable-update-search")) {
        return;
      }
      if (!document.querySelector("[data-floating-surface]")) {
        return;
      }
      handleUpdateSearch();
    };
    document.addEventListener("pointerdown", on_pointer_down, true);
    return () => document.removeEventListener("pointerdown", on_pointer_down, true);
  }, [handleUpdateSearch]);

  if (!appliedQuery?.date) {
    return <Navigate replace to="/" />;
  }

  const handleBook = (room: RoomDay, cellStart: string) => {
    if (!isBookableCell(room, cellStart, selection.interval)) {
      return;
    }
    const next = bookRoom(selection, room, cellStart, appliedSpace);
    setHover(null);
    setSelection(next);
    if (next.interval) {
      setDraftStart(next.interval.start);
      setDraftEnd(next.interval.end);
    }
  };

  const pointerKindFromEvent = (event: { pointerType: string }): PointerKind => {
    return event.pointerType === "mouse" ? "mouse" : "touch";
  };

  const handleCellPointerEnter = (room: RoomDay, cellStart: string, event: { pointerType: string }) => {
    if (event.pointerType !== "mouse" || selection.interval || emptyTimeBookInterval(room, cellStart) == null) {
      return;
    }
    setHover({ roomId: room.id, cellStart });
  };

  const handleCellPointerUp = (room: RoomDay, cellStart: string, event: { pointerType: string }) => {
    if (pointerKindFromEvent(event) === "mouse") {
      return;
    }
    if (!isBookableCell(room, cellStart, selection.interval)) {
      return;
    }
    const target = { roomId: room.id, cellStart };
    const action = emptyTimePointerAction(selection.interval, "touch", hover, target);
    if (action === "preview") {
      setHover(target);
      return;
    }
    handleBook(room, cellStart);
  };

  const handleReviewBooking = () => {
    if (!canReviewBooking(selection) || !selection.interval || !appliedDate) {
      return;
    }
    navigate({
      pathname: "/booking-details",
      search: toBookingDetailsSearchParams({
        date: appliedDate,
        start: selection.interval.start,
        end: selection.interval.end,
        space: appliedSpace,
        roomIds: selection.roomIds,
        ...(appliedMinistryId ? { ministryId: appliedMinistryId } : {}),
        ...(appliedRoom ? { room: appliedRoom } : {}),
      }).toString(),
    });
  };

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-12">
      <form
        aria-label={t("timetable.searchBar")}
        className="flex w-full shrink-0 items-end justify-between gap-4 overflow-visible rounded-[10px] bg-booking-primary px-10 pt-3 pb-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleUpdateSearch();
        }}
      >
        <div className="flex min-w-0 flex-wrap items-end gap-2.5">
          {showMinistryField ? (
            <Select
              clearable
              id="timetable-ministry"
              label={t("timetable.ministry")}
              labelClassName={SEARCH_LABEL_CLASS}
              labels={selectLabels}
              onChange={(value) => setDraftMinistryId(typeof value === "string" ? value : "")}
              options={bookableMinistries.map((ministry) => ({
                value: ministry.id,
                label: ministry.name || ministry.id,
              }))}
              placeholder={t("timetable.ministryNone")}
              size="xs"
              value={draftMinistryId || null}
              wrapperClassName="w-[240px] shrink-0"
            />
          ) : null}
          <DatePicker
            clearable={false}
            id="timetable-date"
            label={t("timetable.date")}
            labelClassName={SEARCH_LABEL_CLASS}
            maxDate={maxDate}
            minDate={minDate}
            onChange={(value) => setDraftDate(fromDatePickerValue(value))}
            placeholder={t("startBooking.when.datePlaceholder")}
            required
            size="xs"
            value={toDatePickerValue(draftDate)}
            wrapperClassName="w-[148px] shrink-0"
          />
          <Select
            className="opacity-100"
            clearable={false}
            disabled
            id="timetable-repetition"
            label={t("timetable.repetition")}
            labelClassName={SEARCH_LABEL_CLASS}
            labels={selectLabels}
            options={[{ value: "one_time", label: t("timetable.oneTime") }]}
            size="xs"
            value="one_time"
            wrapperClassName="w-[124px] shrink-0"
          />
          <div className="flex items-end gap-2.5">
            <TimePicker
              ampm
              id="timetable-start"
              label={t("timetable.start")}
              labelClassName={SEARCH_LABEL_CLASS}
              onChange={(value) => setDraftStart(fromTimePickerValue(value))}
              placeholder={t("startBooking.when.startPlaceholder")}
              size="xs"
              value={toTimePickerValue(draftStart)}
              wrapperClassName="w-[148px] shrink-0"
            />
            <TimePicker
              ampm
              id="timetable-end"
              label={t("timetable.end")}
              labelClassName={SEARCH_LABEL_CLASS}
              onChange={(value) => setDraftEnd(fromTimePickerValue(value))}
              placeholder={t("startBooking.when.endPlaceholder")}
              size="xs"
              value={toTimePickerValue(draftEnd)}
              wrapperClassName="w-[148px] shrink-0"
            />
          </div>
          <Select
            clearable={false}
            id="timetable-space"
            label={t("timetable.roomsCount")}
            labelClassName={SEARCH_LABEL_CLASS}
            labels={selectLabels}
            onChange={(value) => setDraftSpace(value === "multiple" ? "multiple" : "single")}
            options={[
              { value: "single", label: t("timetable.singleRoom") },
              { value: "multiple", label: t("timetable.multipleRooms") },
            ]}
            size="xs"
            value={draftSpace}
            wrapperClassName="w-[152px] shrink-0"
          />
        </div>
        <span className="shrink-0" id="timetable-update-search">
          <Button
            btnType="button"
            className="whitespace-nowrap !border-[0.5px] !border-booking-primary !bg-cta !text-on-cta hover:!bg-cta hover:!text-on-cta"
            onClick={handleUpdateSearch}
            size="xs"
          >
            {t("timetable.updateSearch")}
          </Button>
        </span>
      </form>

      {error ? (
        <Alert
          className="mt-4 shrink-0"
          message={error}
          size="sm"
          title={t("timetable.errorTitle")}
          variant="error"
          width="full"
        />
      ) : null}

      <section className="mt-4 flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[10px] bg-surface px-4 py-5 xl:px-[42px] xl:pt-7 xl:pb-4">
        <div className="flex shrink-0 items-center justify-between gap-6 bg-surface pb-3">
          <div className="flex flex-wrap items-center gap-[52px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="whitespace-nowrap text-sm font-semibold leading-none text-booking-primary">
                {t("timetable.filterByView")}
              </span>
              {(["available", "all"] as TimetableView[]).map((option) => (
                <button
                  aria-pressed={view === option}
                  className="cursor-pointer border-0 bg-transparent p-0 leading-none"
                  key={option}
                  onClick={() => setView(option)}
                  type="button"
                >
                  <Badge color="primary" variant={view === option ? "solid" : "light"}>
                    {option === "available" ? t("timetable.availableRooms") : t("timetable.allRooms")}
                  </Badge>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="whitespace-nowrap text-sm font-semibold leading-none text-booking-primary">
                {t("timetable.filterByCapacity")}
              </span>
              {CAPACITY_BANDS.map((band) => (
                <button
                  aria-pressed={capacityBand === band}
                  className="cursor-pointer border-0 bg-transparent p-0 leading-none"
                  key={band}
                  onClick={() => setCapacityBand((current) => (current === band ? null : band))}
                  type="button"
                >
                  <Badge color="primary" variant={capacityBand === band ? "solid" : "light"}>
                    {band === "1-10"
                      ? t("timetable.capacity1to10")
                      : band === "10-25"
                        ? t("timetable.capacity10to25")
                        : band === "25-50"
                          ? t("timetable.capacity25to50")
                          : t("timetable.capacity50plus")}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Button
              className="whitespace-nowrap !border-[0.5px] !border-booking-primary !bg-cta !text-on-cta hover:!bg-cta hover:!text-on-cta"
              disabled={!canReviewBooking(selection)}
              onClick={handleReviewBooking}
              size="xs"
            >
              {appliedSpace === "multiple"
                ? t("timetable.reviewBookingCount", { count: selection.roomIds.length })
                : t("timetable.reviewBooking")}
            </Button>
            <div className="flex shrink-0 gap-3">
              <Button
                className="min-w-10"
                disabled={safePage === 0}
                onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                size="xs"
                startIcon={<MdArrowBack size={16} />}
              >
                <span className="sr-only">{t("timetable.previousRooms")}</span>
              </Button>
              <Button
                className="min-w-10"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
                size="xs"
                startIcon={<MdArrowForward size={16} />}
              >
                <span className="sr-only">{t("timetable.nextRooms")}</span>
              </Button>
            </div>
          </div>
        </div>

        {loading && rooms.length === 0 ? (
          <Spinner className="mt-6 shrink-0" showText size="sm" text={t("startBooking.loading")} />
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b-4 border-booking-primary bg-surface pt-[13px] pb-4">
            <div className={TIMETABLE_TRACK}>
              <div />
              {noMatching ? (
                <div className="col-span-4 flex h-[168px] items-center justify-center bg-gray-300 text-base font-bold leading-normal text-gray-500">
                  {t("timetable.noMatchingResults")}
                </div>
              ) : (
                paddedRooms.map((room, index) =>
                  room ? (
                    <article className="min-w-0 overflow-hidden bg-booking-primary" key={room.id}>
                      <div className="h-[150px] w-full bg-booking-grey" />
                      <div className="flex items-center justify-between gap-2 px-[15px] py-3">
                        <span className="truncate text-base font-bold leading-none text-white">{room.name}</span>
                        <span className="flex shrink-0 items-center gap-[5px] text-xs font-medium text-brand-100">
                          <CapacityIcon />
                          <span>{room.capacity}</span>
                        </span>
                      </div>
                    </article>
                  ) : (
                    <article className="min-w-0 bg-transparent" key={`empty-${index}`} />
                  )
                )
              )}
            </div>
          </div>

          {noMatching ? null : (
            <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pt-4">
              <div
                aria-label={t("timetable.searchBar")}
                className={cn(TIMETABLE_TRACK, "grid-rows-[repeat(48,40px)]")}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") {
                    setHover(null);
                  }
                }}
              >
                <div aria-hidden className="pointer-events-none col-start-1 row-span-full bg-surface" />
                {hourLabels.map((label, hour) => (
                  <div
                    className="col-start-1 flex items-start justify-end pr-3 text-right text-xs font-medium leading-none whitespace-nowrap text-booking-primary"
                    key={label}
                    style={{ gridRow: hour * 2 + 1 }}
                  >
                    <span className="-translate-y-1/2">{formatClock(label, i18nInstance.language)}</span>
                  </div>
                ))}
                {paddedRooms.map((room, roomIndex) =>
                  Array.from({ length: 48 }, (_, cellIndex) => {
                    const cell = room?.cells[cellIndex];
                    const bookable = room && cell ? isBookableCell(room, cell.start, selection.interval) : false;
                    return (
                      <button
                        className={cn(
                          "relative border-t border-gray-300",
                          cellIndex % 2 === 0 && "border-t-gray-400",
                          cellIndex === 47 && "border-b border-gray-300",
                          cell?.state === "closed" && "bg-gray-200",
                          bookable && "cursor-pointer"
                        )}
                        disabled={!bookable}
                        key={`${room?.id ?? `empty-${roomIndex}`}-${cellIndex}`}
                        onPointerEnter={(event) => {
                          if (room && cell) {
                            handleCellPointerEnter(room, cell.start, event);
                          }
                        }}
                        onPointerDown={(event) => {
                          if (pointerKindFromEvent(event) !== "mouse") {
                            event.preventDefault();
                          }
                        }}
                        onPointerUp={(event) => {
                          if (room && cell) {
                            handleCellPointerUp(room, cell.start, event);
                          }
                        }}
                        onClick={() => {
                          if (room && cell) {
                            handleBook(room, cell.start);
                          }
                        }}
                        style={{ gridColumn: roomIndex + 2, gridRow: cellIndex + 1 }}
                        type="button"
                      />
                    );
                  })
                )}
                {pagedRooms.map((room, roomIndex) =>
                  displayBlocks(room, selection.interval, hover).map((block) => {
                    const startRow = clockToMinutes(block.start) / SLOT_MINUTES + 1;
                    const endRow = clockToMinutes(block.end) / SLOT_MINUTES + 1;
                    const bookableStart =
                      block.state === "available" && isBookableCell(room, block.start, selection.interval);
                    return (
                      <article
                        className={eventClassName(block.state)}
                        key={`${room.id}-${block.start}-${block.state}`}
                        style={{ gridColumn: roomIndex + 2, gridRow: `${startRow} / ${endRow}` }}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <p className="m-0 text-base font-bold leading-normal">{t(`timetable.${block.state}`)}</p>
                          <p className="m-0 text-xs font-medium leading-none">
                            {formatClock(block.start, i18nInstance.language)} –{" "}
                            {formatClock(block.end, i18nInstance.language)}
                          </p>
                        </div>
                        {block.state === "available" && bookableStart ? (
                          <button
                            className="pointer-events-auto inline-flex h-[30px] w-[51px] min-w-[51px] items-center justify-center rounded-[3px] bg-booking-secondary p-0 text-[11.5px] font-bold text-white"
                            onClick={() => handleBook(room, block.start)}
                            type="button"
                          >
                            {t("timetable.book")}
                          </button>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default RoomFilterPage;
