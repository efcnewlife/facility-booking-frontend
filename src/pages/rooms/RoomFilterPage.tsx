import facilityService from "@/api/services/facilityService";
import ministryService from "@/api/services/ministryService";
import BookingCartPanel from "@/components/booking/BookingCartPanel";
import ConfirmBookingTime from "@/components/booking/ConfirmBookingTime";
import ImagePreview from "@/components/booking/ImagePreview";
import RepeatedSeriesPanel from "@/components/booking/RepeatedSeriesPanel";
import ReplaceRepeatedTimeModal from "@/components/booking/ReplaceRepeatedTimeModal";
import type { MinistryItem } from "@/types/ministry";
import { cartStateToDraft, draftToCartState, whenSeedFromSearch } from "@/utils/bookingCartDraft";
import { repeatedBookingDetailsPath } from "@/utils/bookingDetailsPath";
import { buildCreateBookingDraftPayload } from "@/utils/bookingDetailsDraft";
import { applyCartLineQuote, fetchCartLineQuote } from "@/utils/cartLineQuote";
import { canOpenImagePreview } from "@/utils/imagePreview";
import { resolveRecurringBookingSeriesErrorMessage } from "@/utils/recurringBookingErrors";
import { buildCreateRecurringSeriesDraftPayload } from "@/utils/recurringBookingSeries";
import {
  canOpenReview,
  createRecurringSeriesPreviewController,
  emptyRecurringSeriesReviewSnapshot,
  excludedDatesForCreate,
  proposalKeyForAnswers,
  type RecurringSeriesReviewSnapshot,
} from "@/utils/recurringSeriesReview";
import { parseRepeatedRoomIds } from "@/utils/recurringSeriesDraft";
import {
  applyFirstOccurrenceDate,
  applyWeekday,
  canSubmitRepeatedConfirmBookingTime,
  isRepeatedRoomsSearch,
  isSameWeekday,
  occurrencePeriodForDate,
  parseRoomsSearchQuery,
  recurringWhenFromRoomsQuery,
  toRoomsSearchParams,
  weekdayForDate,
  weeklyOccurrenceDates,
  type RecurringWhenValue,
  type RoomsSearchQuery,
  type StartBookingAnswers,
} from "@/utils/startBookingFlow";
import { loadTimetableCart, saveTimetableCart } from "@/utils/timetableCartStorage";
import {
  addCartLine,
  applyRepeatedTimeReplacement,
  blockActionForInterval,
  cartPointerAction,
  clockToMinutes,
  confirmBookingTimePrefillForCart,
  confirmRepeatedCartLine,
  displayBlocksForCart,
  emptyCartState,
  emptyTimeBookInterval,
  hasNoMatchingResults,
  intervalsOverlap,
  isBookableCellForCart,
  isTimetableInitialLoad,
  MAX_BOOKING_LINES,
  minutesToClock,
  pinInterval,
  removeCartLine,
  removeRepeatedCartLine,
  scrollTargetClockForCart,
  SLOT_MINUTES,
  updateCartLine,
  visibleRooms,
  type AvailableOverlayKind,
  type BookingInterval,
  type BookingLine,
  type CapacityBand,
  type CellState,
  type HoverPreview,
  type PointerKind,
  type RoomDay,
  type TimeCell,
  type TimetableCartState,
  type TimetableView,
} from "@/utils/timetableRules";
import {
  Alert,
  Badge,
  Button,
  cn,
  DatePicker,
  FormField,
  Select,
  Spinner,
  type DatePickerValue,
} from "@efcnewlife/newlife-ui";
import dayjs from "dayjs";
import moment from "moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdArrowBack, MdArrowForward, MdCheck, MdPhoto, MdZoomIn } from "react-icons/md";
import { Navigate, useNavigate, useSearchParams } from "react-router";

const ROOMS_PER_PAGE = 4;
const SLOT_HEIGHT_PX = 40;
const GRID_SCROLL_PADDING_PX = 16;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const CAPACITY_BANDS: CapacityBand[] = ["1-10", "10-25", "25-50", "50+"];
const SEARCH_LABEL_CLASS = "mb-[3px] text-sm font-medium leading-none text-booking-light-grey";
const SEARCH_CONTROL_CLASS = "border-outline bg-surface";
const SEARCH_SECONDARY_BUTTON_CLASS =
  "btn-booking-secondary inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50";
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

const toRepeatedRoomsQuery = (base: RoomsSearchQuery, when: RecurringWhenValue): RoomsSearchQuery => {
  const next: RoomsSearchQuery = { frequency: "repeated" };
  if (when.firstOccurrenceDate) {
    next.date = when.firstOccurrenceDate;
  }
  if (when.lastOccurrenceDate) {
    next.lastDate = when.lastOccurrenceDate;
  }
  if (when.weekday != null) {
    next.weekday = when.weekday;
  }
  if (base.start) {
    next.start = base.start;
  }
  if (base.end) {
    next.end = base.end;
  }
  if (base.ministryId) {
    next.ministryId = base.ministryId;
  }
  return next;
};

const draftRecurringWhen = (
  weekday: number | null,
  firstOccurrenceDate: string,
  lastOccurrenceDate: string
): RecurringWhenValue => ({
  weekday,
  firstOccurrenceDate: firstOccurrenceDate || null,
  lastOccurrenceDate: lastOccurrenceDate || null,
  startTime: null,
  endTime: null,
  roomIds: [],
});

const TIMETABLE_OPEN_HOUR_BG = "bg-[#eefaea]";
const TIMETABLE_HOVER_BLOCK_BG = "bg-[#d1f2cd]";
const TIMETABLE_PINNED_BLOCK_BG = "bg-[#a3d9a3]";

const cellUnderlayClassName = (cell: TimeCell | undefined): string => {
  if (!cell) {
    return "";
  }
  if (cell.state === "closed") {
    return "bg-gray-200";
  }
  if (cell.state === "available") {
    return TIMETABLE_OPEN_HOUR_BG;
  }
  return "";
};

const eventClassName = (state: CellState, overlayKind?: AvailableOverlayKind): string => {
  return cn(
    "pointer-events-none flex min-h-0 items-start justify-between overflow-hidden py-2.5 pr-2.5 pl-[18px]",
    overlayKind === "hover" ? "z-[2]" : "z-[1]",
    state === "available" &&
      overlayKind === "hover" &&
      cn("border border-black border-l-[5px] border-l-booking-green text-booking-primary", TIMETABLE_HOVER_BLOCK_BG),
    state === "available" &&
      overlayKind !== "hover" &&
      cn("border border-black border-l-[5px] border-l-booking-green text-booking-primary", TIMETABLE_PINNED_BLOCK_BG),
    state === "unavailable" && "border-l-[5px] border-l-gray-500 bg-gray-300 text-white",
    state === "override" && "border-l-[5px] border-l-error bg-error-container text-booking-primary"
  );
};

const CapacityIcon = () => (
  <svg aria-hidden fill="none" height="11" viewBox="0 0 18 11" width="18" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M0 11V9.35C0 8.59375 0.45 7.975 1.275 7.49375C2.1 7.0125 3.225 6.80625 4.575 6.80625C5.925 6.80625 5.025 6.80625 5.325 6.80625C5.625 6.80625 6.375 6.875 6.75 7.08125C6.3 7.2875 5.325 8.18125 5.325 9.28125V11H0ZM6 11V9.4875C6 9.00625 6.15 8.525 6.45 8.1125C6.75 7.7 7.125 7.35625 7.725 7.08125C8.325 6.80625 8.925 6.53125 9.675 6.39375C10.425 6.25625 11.25 6.1875 12.075 6.1875C12.9 6.1875 13.8 6.25625 14.475 6.39375C15.15 6.53125 15.825 6.80625 16.35 7.08125C16.875 7.35625 17.325 7.76875 17.55 8.1125C17.775 8.45625 18 8.9375 18 9.4875V11H6ZM4.575 5.775C3.975 5.775 3.375 5.56875 2.925 5.15625C2.475 4.74375 2.25 4.2625 2.25 3.64375C2.25 3.025 2.475 2.54375 2.925 2.13125C3.375 1.71875 3.9 1.5125 4.575 1.5125C5.25 1.5125 5.775 1.71875 6.225 2.13125C6.675 4.74375 6.9 3.025 6.9 3.64375C6.9 4.2625 6.675 4.74375 6.225 5.15625C5.775 5.56875 5.25 5.775 4.575 5.775ZM12 5.5C11.175 5.5 10.425 5.225 9.9 4.675C9.3 4.125 9 3.50625 9 2.75C9 1.99375 9.3 1.30625 9.9 0.75625C10.5 0.20625 11.175 0 12 0C12.825 0 13.575 0.275 14.175 0.75625C14.775 1.2375 15 1.925 15 2.75C15 3.575 14.7 4.19375 14.175 4.675C13.575 5.225 12.9 5.5 12 5.5Z"
      fill="#DFEDFF"
    />
  </svg>
);

const buildInitialCartState = (query: RoomsSearchQuery | null): TimetableCartState => {
  const whenSeed = whenSeedFromSearch(query?.start, query?.end);
  if (!query?.date) {
    return emptyCartState(whenSeed);
  }
  const draft = loadTimetableCart(window.localStorage, query.date, query.ministryId);
  if (draft) {
    return draftToCartState(draft, whenSeed);
  }
  return emptyCartState(whenSeed);
};

const QUOTE_KEY_SEP = "\0";

const lineQuoteKey = (line: Pick<BookingLine, "sequence" | "facilityId" | "start" | "end">): string => {
  return [line.sequence, line.facilityId, line.start, line.end].join(QUOTE_KEY_SEP);
};

const RoomFilterPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const appliedQuery = useMemo(() => parseRoomsSearchQuery(new URLSearchParams(searchKey)), [searchKey]);
  const isRepeated = isRepeatedRoomsSearch(appliedQuery);

  const [draftDate, setDraftDate] = useState(appliedQuery?.date ?? "");
  const [draftLastDate, setDraftLastDate] = useState(appliedQuery?.lastDate ?? "");
  const [draftWeekday, setDraftWeekday] = useState<number | null>(
    appliedQuery?.weekday ?? weekdayForDate(appliedQuery?.date ?? "") ?? null
  );
  const [draftMinistryId, setDraftMinistryId] = useState(appliedQuery?.ministryId ?? "");
  const [view, setView] = useState<TimetableView>("available");
  const [capacityBand, setCapacityBand] = useState<CapacityBand | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [rooms, setRooms] = useState<RoomDay[]>([]);
  const [maxBookingLines, setMaxBookingLines] = useState(MAX_BOOKING_LINES);
  const [bookableMinistries, setBookableMinistries] = useState<MinistryItem[]>([]);
  const [cartState, setCartState] = useState<TimetableCartState>(() => {
    if (isRepeated) {
      const whenSeed = whenSeedFromSearch(appliedQuery?.start, appliedQuery?.end);
      const roomIds = parseRepeatedRoomIds(searchParams);
      if (appliedQuery?.start && appliedQuery?.end && roomIds.length > 0) {
        return {
          ...emptyCartState(whenSeed),
          sharedTime: { start: appliedQuery.start, end: appliedQuery.end },
          lines: roomIds.map((facilityId, index) => ({
            sequence: index + 1,
            facilityId,
            start: appliedQuery.start as string,
            end: appliedQuery.end as string,
          })),
        };
      }
      return emptyCartState(whenSeed);
    }
    return buildInitialCartState(appliedQuery);
  });
  const [loading, setLoading] = useState(() => Boolean(appliedQuery?.date));
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverPreview | null>(null);
  const [confirmRoom, setConfirmRoom] = useState<RoomDay | null>(null);
  const [confirmStart, setConfirmStart] = useState("");
  const [confirmEnd, setConfirmEnd] = useState("");
  const [confirmLastDate, setConfirmLastDate] = useState("");
  const [editingSequence, setEditingSequence] = useState<number | undefined>(undefined);
  const [pendingReplacement, setPendingReplacement] = useState<{ room: RoomDay; interval: BookingInterval } | null>(
    null
  );
  const [previewUrls, setPreviewUrls] = useState<string[] | null>(null);
  const [reviewState, setReviewState] = useState<RecurringSeriesReviewSnapshot>(emptyRecurringSeriesReviewSnapshot);
  const [repeatedWindowOpen, setRepeatedWindowOpen] = useState<boolean | null>(isRepeated ? null : true);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const seriesPreviewControllerRef = useRef<ReturnType<typeof createRecurringSeriesPreviewController> | null>(null);

  const appliedDate = appliedQuery?.date ?? "";
  const appliedMinistryId = appliedQuery?.ministryId;
  const whenSeed = useMemo(
    () => whenSeedFromSearch(appliedQuery?.start, appliedQuery?.end),
    [appliedQuery?.end, appliedQuery?.start]
  );
  const recurringWhen = useMemo(
    () =>
      isRepeated && appliedQuery
        ? {
            ...recurringWhenFromRoomsQuery(
              appliedQuery,
              cartState.lines.map((line) => line.facilityId)
            ),
            startTime: cartState.sharedTime?.start ?? null,
            endTime: cartState.sharedTime?.end ?? null,
          }
        : null,
    [appliedQuery, cartState.lines, cartState.sharedTime, isRepeated]
  );
  const repeatedAnswers = useMemo((): StartBookingAnswers | null => {
    if (!isRepeated || !appliedQuery || !recurringWhen) {
      return null;
    }
    return {
      isMinistryBooking: Boolean(appliedQuery.ministryId),
      ministryId: appliedQuery.ministryId ?? null,
      frequency: "repeated",
      when: { date: null, start: null, end: null },
      recurringWhen,
    };
  }, [appliedQuery, isRepeated, recurringWhen]);
  const repeatedProposalKey = repeatedAnswers ? proposalKeyForAnswers(repeatedAnswers) : null;
  const scheduleFirstDate = isRepeated ? draftDate : "";
  const scheduleLastDate = isRepeated ? draftLastDate : "";
  const recurringWeekdayMismatch = Boolean(
    scheduleFirstDate && scheduleLastDate && !isSameWeekday(scheduleFirstDate, scheduleLastDate)
  );
  const recurringLastBeforeFirst = Boolean(
    scheduleFirstDate &&
    scheduleLastDate &&
    moment(scheduleLastDate, "YYYY-MM-DD", true).isBefore(moment(scheduleFirstDate, "YYYY-MM-DD", true), "day")
  );
  const recurringUsePeriodMismatch = Boolean(
    !recurringWeekdayMismatch &&
    !recurringLastBeforeFirst &&
    scheduleFirstDate &&
    scheduleLastDate &&
    occurrencePeriodForDate(scheduleFirstDate) !== occurrencePeriodForDate(scheduleLastDate)
  );
  const recurringLastOccurrenceError = recurringLastBeforeFirst
    ? t("startBooking.recurringWhen.dateOrder")
    : recurringWeekdayMismatch
      ? t("startBooking.recurringWhen.weekdayMismatch")
      : recurringUsePeriodMismatch
        ? t("startBooking.recurringWhen.usePeriodMismatch")
        : undefined;
  const recurringOccurrenceCount =
    scheduleFirstDate &&
    scheduleLastDate &&
    !recurringWeekdayMismatch &&
    !recurringLastBeforeFirst &&
    !recurringUsePeriodMismatch
      ? weeklyOccurrenceDates(scheduleFirstDate, scheduleLastDate).length
      : 0;
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
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { rooms: items, maxBookingLines: cap } = await facilityService.getAvailability(
        appliedDate,
        appliedMinistryId
      );
      setRooms(items);
      setMaxBookingLines(cap);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("timetable.loadError"));
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

  useEffect(() => {
    const controller = createRecurringSeriesPreviewController({
      onState: setReviewState,
      preview: async (payload) => {
        try {
          return await facilityService.previewBookingSeries(payload);
        } catch (err) {
          throw new Error(
            resolveRecurringBookingSeriesErrorMessage(err, "startBooking.errors.previewRecurringBooking")
          );
        }
      },
    });
    seriesPreviewControllerRef.current = controller;
    return () => {
      controller.dispose();
      seriesPreviewControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isRepeated) {
      seriesPreviewControllerRef.current?.setProposal(null);
      return;
    }
    seriesPreviewControllerRef.current?.setProposal(repeatedProposalKey && repeatedAnswers ? repeatedAnswers : null);
  }, [isRepeated, repeatedAnswers, repeatedProposalKey]);

  const appliedKey = `${appliedDate}|${appliedMinistryId ?? ""}|${whenSeed?.start ?? ""}|${whenSeed?.end ?? ""}`;
  const prevAppliedKeyRef = useRef(appliedKey);

  useEffect(() => {
    if (prevAppliedKeyRef.current === appliedKey) {
      return;
    }
    prevAppliedKeyRef.current = appliedKey;
    setCartState(emptyCartState(whenSeed));
    setHover(null);
    setConfirmRoom(null);
    setEditingSequence(undefined);
    setPendingReplacement(null);
  }, [appliedKey, whenSeed]);

  const listedRooms = useMemo(
    () => visibleRooms(rooms, view, whenSeed, capacityBand),
    [capacityBand, rooms, view, whenSeed]
  );
  const noMatching = hasNoMatchingResults(rooms, view, whenSeed, capacityBand);
  const isInitialLoad = isTimetableInitialLoad(loading, rooms.length);
  const showNoMatching = noMatching && !isInitialLoad && Boolean(appliedDate);
  const pageCount = Math.max(1, Math.ceil(listedRooms.length / ROOMS_PER_PAGE));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const pagedRooms = listedRooms.slice(safePage * ROOMS_PER_PAGE, safePage * ROOMS_PER_PAGE + ROOMS_PER_PAGE);
  const paddedRooms: Array<RoomDay | null> = [
    ...pagedRooms,
    ...Array.from({ length: Math.max(0, ROOMS_PER_PAGE - pagedRooms.length) }, () => null),
  ];

  useEffect(() => {
    setPageIndex(0);
  }, [view, capacityBand, appliedDate, listedRooms.length]);

  useEffect(() => {
    if (loading || rooms.length === 0) {
      return;
    }
    if (hasNoMatchingResults(rooms, view, whenSeed, capacityBand)) {
      return;
    }
    const roomsForScroll = visibleRooms(rooms, view, whenSeed, capacityBand);
    const scroller = gridScrollRef.current;
    if (!scroller) {
      return;
    }
    const clock = scrollTargetClockForCart(roomsForScroll, whenSeed, null);
    const top = GRID_SCROLL_PADDING_PX + (clockToMinutes(clock) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [appliedDate, capacityBand, loading, rooms, view, whenSeed]);

  const linesNeedingQuoteKey = cartState.lines
    .filter((line) => line.lineSubtotal == null)
    .map(lineQuoteKey)
    .join("|");

  useEffect(() => {
    if (isRepeated || !appliedDate || !linesNeedingQuoteKey) {
      return;
    }
    let cancelled = false;
    const segments = linesNeedingQuoteKey.split("|").filter(Boolean);
    const loadQuotes = async () => {
      for (const segment of segments) {
        const parts = segment.split(QUOTE_KEY_SEP);
        if (parts.length !== 4) {
          continue;
        }
        const sequence = Number.parseInt(parts[0], 10);
        const facilityId = parts[1];
        const start = parts[2];
        const end = parts[3];
        if (!Number.isFinite(sequence)) {
          continue;
        }
        try {
          const quote = await fetchCartLineQuote(appliedDate, { facilityId, start, end }, appliedMinistryId);
          if (cancelled) {
            return;
          }
          setCartState((current) => {
            const existing = current.lines.find((item) => item.sequence === sequence);
            if (!existing || existing.lineSubtotal != null) {
              return current;
            }
            if (lineQuoteKey(existing) !== segment) {
              return current;
            }
            return applyCartLineQuote(current, sequence, quote);
          });
        } catch {
          // Leave em dash subtotal when quote fails.
        }
      }
    };
    void loadQuotes();
    return () => {
      cancelled = true;
    };
  }, [appliedDate, appliedMinistryId, isRepeated, linesNeedingQuoteKey]);

  const handleUpdateSearch = useCallback(() => {
    if (loading) {
      return;
    }
    if (!moment(draftDate, "YYYY-MM-DD", true).isValid()) {
      setError(t(isRepeated ? "timetable.startDate" : "timetable.date"));
      return;
    }
    const dateChanged = draftDate !== appliedDate;
    const ministryChanged = draftMinistryId !== (appliedMinistryId ?? "");
    const lastDateChanged = isRepeated && draftLastDate !== (appliedQuery?.lastDate ?? "");
    const weekdayChanged = isRepeated && draftWeekday !== (appliedQuery?.weekday ?? null);
    if (!dateChanged && !ministryChanged && !lastDateChanged && !weekdayChanged) {
      return;
    }
    if (isRepeated && appliedQuery) {
      const current = recurringWhenFromRoomsQuery(appliedQuery, []);
      const withDrafts = { ...current, lastOccurrenceDate: draftLastDate || null, weekday: draftWeekday };
      const nextWhen = draftDate
        ? applyFirstOccurrenceDate(withDrafts, draftDate)
        : draftWeekday != null
          ? applyWeekday(withDrafts, draftWeekday)
          : withDrafts;
      const next = toRepeatedRoomsQuery(appliedQuery, nextWhen);
      if (draftLastDate && nextWhen.lastOccurrenceDate) {
        next.lastDate = nextWhen.lastOccurrenceDate;
      } else if (draftLastDate) {
        next.lastDate = draftLastDate;
      } else {
        delete next.lastDate;
      }
      if (draftMinistryId) {
        next.ministryId = draftMinistryId;
      } else {
        delete next.ministryId;
      }
      setSearchParams(toRoomsSearchParams(next), { replace: true });
      setDraftDate(next.date ?? draftDate);
      setDraftLastDate(next.lastDate ?? "");
      setDraftWeekday(next.weekday ?? nextWhen.weekday ?? null);
      setHover(null);
      setError(null);
      return;
    }
    const next: RoomsSearchQuery = { date: draftDate };
    if (draftMinistryId) {
      next.ministryId = draftMinistryId;
    }
    if (!dateChanged && appliedQuery?.start && appliedQuery?.end) {
      next.start = appliedQuery.start;
      next.end = appliedQuery.end;
    }
    setSearchParams(toRoomsSearchParams(next), { replace: true });
    setHover(null);
    setError(null);
  }, [
    appliedDate,
    appliedMinistryId,
    appliedQuery,
    draftDate,
    draftLastDate,
    draftMinistryId,
    draftWeekday,
    isRepeated,
    loading,
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
      if (loading) {
        return;
      }
      if (!document.querySelector("[data-floating-surface]")) {
        return;
      }
      handleUpdateSearch();
    };
    document.addEventListener("pointerdown", on_pointer_down, true);
    return () => document.removeEventListener("pointerdown", on_pointer_down, true);
  }, [handleUpdateSearch, loading]);

  useEffect(() => {
    if (!isRepeated) {
      return;
    }
    let cancelled = false;
    const loadWindow = async () => {
      try {
        const status = await facilityService.getRecurringBookingWindowStatus(appliedQuery?.date ?? null);
        if (!cancelled) {
          setRepeatedWindowOpen(status.isOpen);
        }
      } catch {
        if (!cancelled) {
          setRepeatedWindowOpen(false);
        }
      }
    };
    void loadWindow();
    return () => {
      cancelled = true;
    };
  }, [appliedQuery?.date, isRepeated]);

  if (!appliedQuery || (!isRepeated && !appliedQuery.date)) {
    return <Navigate replace to="/" />;
  }

  if (isRepeated && repeatedWindowOpen === false) {
    return <Navigate replace to="/start-booking?step=frequency" />;
  }

  const handlePinCell = (room: RoomDay, cellStart: string) => {
    if (!isBookableCellForCart(room, cellStart, cartState)) {
      return;
    }
    setCartState((current) => pinInterval(current, room, cellStart));
    setHover(null);
  };

  const handleOpenConfirmBookingTime = (room: RoomDay, cellStart: string, sequence?: number) => {
    const prefill = confirmBookingTimePrefillForCart(room, cartState, cellStart, sequence);
    if (!prefill) {
      return;
    }
    setHover(null);
    setConfirmRoom(room);
    setConfirmStart(prefill.start);
    setConfirmEnd(prefill.end);
    setConfirmLastDate(draftLastDate || appliedQuery?.lastDate || "");
    setEditingSequence(sequence);
  };

  const handleCancelConfirmBookingTime = () => {
    setConfirmRoom(null);
    setConfirmStart("");
    setConfirmEnd("");
    setConfirmLastDate("");
    setEditingSequence(undefined);
  };

  const persistCartState = (state: TimetableCartState) => {
    if (isRepeated || !appliedDate) {
      return;
    }
    saveTimetableCart(window.localStorage, cartStateToDraft(appliedDate, appliedMinistryId, state));
  };

  const persistRepeatedLastDate = (lastDate: string) => {
    if (!appliedQuery || !appliedDate || !lastDate) {
      return;
    }
    const current = recurringWhenFromRoomsQuery(appliedQuery, []);
    const nextWhen = applyFirstOccurrenceDate({ ...current, lastOccurrenceDate: lastDate }, appliedDate);
    if (!nextWhen.lastOccurrenceDate) {
      return;
    }
    const next = toRepeatedRoomsQuery(appliedQuery, nextWhen);
    if (draftMinistryId) {
      next.ministryId = draftMinistryId;
    } else {
      delete next.ministryId;
    }
    setDraftLastDate(next.lastDate ?? lastDate);
    if (appliedQuery.lastDate !== next.lastDate) {
      setSearchParams(toRoomsSearchParams(next), { replace: true });
    }
  };

  const handleConfirmBookingTime = async (interval: BookingInterval) => {
    if (!confirmRoom || !appliedDate) {
      return;
    }
    if (isRepeated) {
      if (!appliedQuery || !canSubmitRepeatedConfirmBookingTime(appliedDate, confirmLastDate || null, draftWeekday)) {
        return;
      }
      persistRepeatedLastDate(confirmLastDate);
      const candidate = { facilityId: confirmRoom.id, start: interval.start, end: interval.end };
      const result = confirmRepeatedCartLine(cartState, candidate, maxBookingLines);
      if (result.decision === "replace") {
        setPendingReplacement({ room: confirmRoom, interval });
        return;
      }
      handleCancelConfirmBookingTime();
      if (result.decision === "added") {
        setCartState(result.state);
      }
      return;
    }
    let nextState: TimetableCartState | null = null;
    let quotedSequence: number | undefined;
    if (editingSequence != null) {
      const updated = updateCartLine(cartState, editingSequence, {
        facilityId: confirmRoom.id,
        start: interval.start,
        end: interval.end,
      });
      if (updated) {
        nextState = updated;
        quotedSequence = editingSequence;
      }
    } else {
      const next = addCartLine(
        cartState,
        {
          facilityId: confirmRoom.id,
          start: interval.start,
          end: interval.end,
        },
        maxBookingLines
      );
      if (next) {
        nextState = next;
        quotedSequence = next.lines[next.lines.length - 1]?.sequence;
      }
    }
    handleCancelConfirmBookingTime();
    if (!nextState || quotedSequence == null) {
      return;
    }
    setCartState(nextState);
    persistCartState(nextState);
    const line = nextState.lines.find((item) => item.sequence === quotedSequence);
    if (!line) {
      return;
    }
    try {
      const quote = await fetchCartLineQuote(appliedDate, line, appliedMinistryId);
      setCartState((current) => applyCartLineQuote(current, quotedSequence!, quote));
    } catch {
      // Leave em dash subtotal when quote fails.
    }
  };

  const handleConfirmReplacement = () => {
    if (!pendingReplacement) {
      return;
    }
    const result = applyRepeatedTimeReplacement(
      cartState,
      {
        facilityId: pendingReplacement.room.id,
        start: pendingReplacement.interval.start,
        end: pendingReplacement.interval.end,
      },
      maxBookingLines
    );
    setPendingReplacement(null);
    handleCancelConfirmBookingTime();
    if (result.decision === "added") {
      setReviewState(emptyRecurringSeriesReviewSnapshot);
      setCartState(result.state);
    }
  };

  const handleCancelReplacement = () => {
    setPendingReplacement(null);
    handleCancelConfirmBookingTime();
  };

  const pointerKindFromEvent = (event: { pointerType: string }): PointerKind => {
    return event.pointerType === "mouse" ? "mouse" : "touch";
  };

  const handleCellPointerEnter = (room: RoomDay, cellStart: string, event: { pointerType: string }) => {
    if (event.pointerType !== "mouse") {
      return;
    }
    const preview = emptyTimeBookInterval(room, cellStart);
    if (!preview) {
      setHover(null);
      return;
    }
    const pinnedOnRoom =
      cartState.pinned?.facilityId === room.id ? { start: cartState.pinned.start, end: cartState.pinned.end } : null;
    if (pinnedOnRoom && intervalsOverlap(preview, pinnedOnRoom)) {
      setHover(null);
      return;
    }
    setHover({ roomId: room.id, cellStart });
  };

  const handleCellPointerUp = (room: RoomDay, cellStart: string, event: { pointerType: string }) => {
    if (!isBookableCellForCart(room, cellStart, cartState)) {
      return;
    }
    const target = { roomId: room.id, cellStart };
    const action = cartPointerAction(cartState.pinned, pointerKindFromEvent(event), hover, target);
    if (action === "preview") {
      setHover(target);
      return;
    }
    handlePinCell(room, cellStart);
  };

  const handleReviewBooking = async () => {
    if (isRepeated) {
      if (!canOpenReview(reviewState) || !repeatedAnswers) {
        return;
      }
      const payload = buildCreateRecurringSeriesDraftPayload(
        repeatedAnswers,
        new Date(),
        excludedDatesForCreate(reviewState)
      );
      if (!payload) {
        return;
      }
      try {
        const created = await facilityService.createBookingSeriesDraft(payload);
        navigate(repeatedBookingDetailsPath(created.id));
      } catch (err) {
        setError(resolveRecurringBookingSeriesErrorMessage(err, "timetable.reviewError"));
      }
      return;
    }
    if (cartState.lines.length === 0 || !appliedDate) {
      return;
    }
    const nextDraft = cartStateToDraft(appliedDate, appliedMinistryId, cartState);
    if (!nextDraft) {
      return;
    }
    try {
      const created = await facilityService.createBookingDraft(buildCreateBookingDraftPayload(nextDraft));
      navigate(`/booking-details/one-time/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("timetable.reviewError"));
    }
  };

  const handleDraftStartDateChange = (value: DatePickerValue) => {
    const next = applyFirstOccurrenceDate(
      draftRecurringWhen(draftWeekday, draftDate, draftLastDate),
      fromDatePickerValue(value) || null
    );
    setDraftDate(next.firstOccurrenceDate ?? "");
    setDraftWeekday(next.weekday);
    setDraftLastDate(next.lastOccurrenceDate ?? "");
  };

  const handleDraftWeekdayChange = (weekday: number) => {
    const next = applyWeekday(draftRecurringWhen(draftWeekday, draftDate, draftLastDate), weekday);
    setDraftWeekday(next.weekday);
    setDraftDate(next.firstOccurrenceDate ?? "");
    setDraftLastDate(next.lastOccurrenceDate ?? "");
  };

  const formatClockForLocale = (clock: string) => formatClock(clock, i18nInstance.language);

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-12">
      <form
        aria-label={t("timetable.searchBar")}
        className="flex w-full shrink-0 items-end justify-between gap-4 overflow-visible rounded-[10px] bg-booking-primary px-10 pt-3 pb-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) {
            handleUpdateSearch();
          }
        }}
      >
        <div className="flex min-w-0 flex-wrap items-end gap-2.5">
          {showMinistryField ? (
            <Select
              className={SEARCH_CONTROL_CLASS}
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
              size="sm"
              value={draftMinistryId || null}
              wrapperClassName="w-[240px] shrink-0"
            />
          ) : null}
          <Select
            className={cn("opacity-100", SEARCH_CONTROL_CLASS)}
            clearable={false}
            disabled
            id="timetable-repetition"
            label={t("timetable.repetition")}
            labelClassName={SEARCH_LABEL_CLASS}
            labels={selectLabels}
            options={[
              { value: "one_time", label: t("timetable.oneTime") },
              { value: "repeated", label: t("timetable.repeated") },
            ]}
            size="sm"
            value={isRepeated ? "repeated" : "one_time"}
            wrapperClassName="w-[124px] shrink-0"
          />
          <DatePicker
            className={SEARCH_CONTROL_CLASS}
            clearable={false}
            id="timetable-date"
            label={isRepeated ? t("timetable.startDate") : t("timetable.date")}
            labelClassName={SEARCH_LABEL_CLASS}
            maxDate={maxDate}
            minDate={minDate}
            onChange={handleDraftStartDateChange}
            placeholder={t("startBooking.when.datePlaceholder")}
            required
            size="sm"
            value={toDatePickerValue(draftDate)}
            wrapperClassName="w-[148px] shrink-0"
          />
          {isRepeated ? (
            <>
              <DatePicker
                className={SEARCH_CONTROL_CLASS}
                error={recurringLastOccurrenceError}
                id="timetable-end-date"
                label={t("timetable.endDate")}
                labelClassName={SEARCH_LABEL_CLASS}
                maxDate={maxDate}
                minDate={minDate}
                onChange={(value) => setDraftLastDate(fromDatePickerValue(value))}
                placeholder={t("startBooking.when.datePlaceholder")}
                size="sm"
                value={toDatePickerValue(draftLastDate)}
                wrapperClassName="w-[148px] shrink-0"
              />
              <FormField
                id="timetable-repeat-on"
                label={t("timetable.repeatOn")}
                labelClassName={SEARCH_LABEL_CLASS}
                wrapperClassName="shrink-0"
              >
                <div className="flex h-9 items-center gap-1" id="timetable-repeat-on">
                  {WEEKDAYS.map((day) => (
                    <button
                      aria-label={t(`startBooking.recurringSchedule.weekdays.${day}`)}
                      aria-pressed={draftWeekday === day}
                      className={cn(
                        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-outline text-xs font-semibold",
                        draftWeekday === day
                          ? "bg-primary text-on-primary"
                          : "bg-white text-booking-primary hover:bg-white/90"
                      )}
                      key={day}
                      onClick={() => handleDraftWeekdayChange(day)}
                      type="button"
                    >
                      {t(`timetable.weekdaysShort.${day}`)}
                    </button>
                  ))}
                </div>
              </FormField>
              {recurringOccurrenceCount > 0 ? (
                <p className="m-0 mb-2 text-sm text-booking-light-grey">
                  {t("startBooking.recurringWhen.occurrenceCount", { count: recurringOccurrenceCount })}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        <span className="shrink-0" id="timetable-update-search">
          <button className={SEARCH_SECONDARY_BUTTON_CLASS} disabled={loading} type="submit">
            {t("timetable.updateSearch")}
          </button>
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

      <div className="mt-4 flex min-h-0 w-full flex-1 gap-4 overflow-hidden">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-surface px-4 py-5 xl:px-[42px] xl:pt-7 xl:pb-4">
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

          <div className="flex min-h-0 flex-1 flex-col">
            {isRepeated && !appliedDate ? (
              <div className="flex min-h-[min(420px,50vh)] flex-1 items-center justify-center">
                <p className="text-base text-on-surface-variant">{t("startBooking.recurringSchedule.needStartsOn")}</p>
              </div>
            ) : isInitialLoad ? (
              <div aria-busy="true" className="flex min-h-[min(420px,50vh)] flex-1 items-center justify-center">
                <Spinner showText size="sm" text={t("startBooking.loading")} />
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b-4 border-booking-primary bg-surface pt-[13px] pb-4">
                  <div className={TIMETABLE_TRACK}>
                    <div />
                    {showNoMatching ? (
                      <div className="col-span-4 flex h-[168px] items-center justify-center bg-gray-300 text-base font-bold leading-normal text-gray-500">
                        {t("timetable.noMatchingResults")}
                      </div>
                    ) : (
                      paddedRooms.map((room, index) =>
                        room ? (
                          <article className="min-w-0 overflow-hidden bg-booking-primary" key={room.id}>
                            <div className="relative h-[150px] w-full bg-booking-grey">
                              {canOpenImagePreview(room.photoUrls) ? (
                                <button
                                  aria-label={t("imagePreview.zoom")}
                                  className="relative h-full w-full p-0"
                                  onClick={() => setPreviewUrls(room.photoUrls)}
                                  type="button"
                                >
                                  <img alt="" className="size-full object-cover" src={room.photoUrls[0]} />
                                  <span className="pointer-events-none absolute top-2 right-2 flex size-9 items-center justify-center text-white">
                                    <MdZoomIn size={23} />
                                  </span>
                                </button>
                              ) : (
                                <div
                                  aria-hidden
                                  className="flex size-full items-center justify-center text-booking-primary/40"
                                >
                                  <MdPhoto size={48} />
                                </div>
                              )}
                            </div>
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

                {showNoMatching ? null : (
                  <div className="relative min-h-0 flex-1">
                    {loading && rooms.length > 0 ? (
                      <div
                        aria-busy="true"
                        className="absolute inset-0 z-10 flex items-center justify-center bg-surface/70"
                      >
                        <Spinner showText size="sm" text={t("startBooking.loading")} />
                      </div>
                    ) : null}
                    <div
                      className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pt-4"
                      ref={gridScrollRef}
                    >
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
                            <span className="-translate-y-1/2">{formatClockForLocale(label)}</span>
                          </div>
                        ))}
                        {paddedRooms.map((room, roomIndex) =>
                          Array.from({ length: 48 }, (_, cellIndex) => {
                            const cell = room?.cells[cellIndex];
                            const bookable = room && cell ? isBookableCellForCart(room, cell.start, cartState) : false;
                            return (
                              <button
                                className={cn(
                                  "relative border-t border-gray-300",
                                  cellIndex % 2 === 0 && "border-t-gray-400",
                                  cellIndex === 47 && "border-b border-gray-300",
                                  cellUnderlayClassName(cell),
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
                                onClick={(event) => {
                                  if (room && cell && event.detail === 0) {
                                    handlePinCell(room, cell.start);
                                  }
                                }}
                                style={{ gridColumn: roomIndex + 2, gridRow: cellIndex + 1 }}
                                type="button"
                              />
                            );
                          })
                        )}
                        {pagedRooms.map((room, roomIndex) =>
                          displayBlocksForCart(room, cartState, hover).map((block) => {
                            const startRow = clockToMinutes(block.start) / SLOT_MINUTES + 1;
                            const endRow = clockToMinutes(block.end) / SLOT_MINUTES + 1;
                            const isPinnedOverlay = block.overlayKind === "pinned";
                            const isCommittedOverlay = block.overlayKind === "committed";
                            const bookableStart =
                              isPinnedOverlay &&
                              block.state === "available" &&
                              isBookableCellForCart(room, block.start, cartState);
                            const blockAction =
                              (isPinnedOverlay || isCommittedOverlay) && block.state === "available"
                                ? blockActionForInterval(cartState.lines, room.id, block)
                                : null;
                            return (
                              <article
                                className={eventClassName(block.state, block.overlayKind)}
                                key={`${room.id}-${block.start}-${block.state}-${block.overlayKind ?? "occupied"}`}
                                style={{ gridColumn: roomIndex + 2, gridRow: `${startRow} / ${endRow}` }}
                              >
                                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                  <p className="m-0 text-base font-bold leading-normal">
                                    {t(`timetable.${block.state}`)}
                                  </p>
                                  <p className="m-0 text-xs font-medium leading-none">
                                    {formatClockForLocale(block.start)} – {formatClockForLocale(block.end)}
                                  </p>
                                </div>
                                {block.state === "available" && bookableStart && blockAction === "add" ? (
                                  <button
                                    className="pointer-events-auto inline-flex h-[30px] w-[51px] min-w-[51px] items-center justify-center rounded-[3px] bg-booking-secondary p-0 text-[11.5px] font-bold text-white"
                                    onClick={() => handleOpenConfirmBookingTime(room, block.start)}
                                    type="button"
                                  >
                                    {t("timetable.add")}
                                  </button>
                                ) : null}
                                {block.state === "available" &&
                                (isPinnedOverlay || isCommittedOverlay) &&
                                blockAction === "checkmark" ? (
                                  <span
                                    aria-label={t("timetable.addedToCart")}
                                    className="pointer-events-none inline-flex h-[30px] w-[51px] min-w-[51px] items-center justify-center rounded-[3px] bg-booking-green text-white"
                                  >
                                    <MdCheck aria-hidden size={18} />
                                  </span>
                                ) : null}
                              </article>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {isRepeated ? (
          <RepeatedSeriesPanel
            formatClock={formatClockForLocale}
            lines={cartState.lines}
            onRemove={(sequence) => {
              setCartState((current) => removeRepeatedCartLine(current, sequence));
            }}
            onReview={() => void handleReviewBooking()}
            reviewState={reviewState}
            rooms={rooms}
            sharedTime={cartState.sharedTime ?? null}
          />
        ) : (
          <BookingCartPanel
            formatClock={formatClockForLocale}
            lines={cartState.lines}
            onEdit={(sequence) => {
              const line = cartState.lines.find((item) => item.sequence === sequence);
              const room = line ? rooms.find((item) => item.id === line.facilityId) : undefined;
              if (line && room) {
                handleOpenConfirmBookingTime(room, line.start, sequence);
              }
            }}
            onRemove={(sequence) => {
              setCartState((current) => {
                const next = removeCartLine(current, sequence);
                persistCartState(next);
                return next;
              });
            }}
            onReview={() => void handleReviewBooking()}
            rooms={rooms}
          />
        )}
      </div>

      {confirmRoom && appliedDate && !pendingReplacement ? (
        <ConfirmBookingTime
          date={appliedDate}
          end={confirmEnd}
          lastOccurrenceDate={confirmLastDate}
          maxDate={maxDate}
          minDate={appliedDate || minDate}
          onCancel={handleCancelConfirmBookingTime}
          onConfirm={handleConfirmBookingTime}
          onEndChange={setConfirmEnd}
          onLastOccurrenceDateChange={setConfirmLastDate}
          onStartChange={setConfirmStart}
          requireLastOccurrence={isRepeated}
          room={confirmRoom}
          start={confirmStart}
          weekday={draftWeekday}
        />
      ) : null}
      {pendingReplacement ? (
        <ReplaceRepeatedTimeModal isOpen onCancel={handleCancelReplacement} onConfirm={handleConfirmReplacement} />
      ) : null}
      {previewUrls ? <ImagePreview onClose={() => setPreviewUrls(null)} photoUrls={previewUrls} /> : null}
    </main>
  );
};

export default RoomFilterPage;
