import { canConfirmBookingTime, type BookingInterval, type RoomDay } from "@/utils/timetableRules";
import {
  Button,
  DatePicker,
  Modal,
  TimePicker,
  type DatePickerValue,
  type TimePickerValue,
} from "@efcnewlife/newlife-ui";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

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

interface ConfirmBookingTimeProps {
  date: string;
  room: RoomDay;
  start: string;
  end: string;
  onStartChange: (start: string) => void;
  onEndChange: (end: string) => void;
  onCancel: () => void;
  onConfirm: (interval: BookingInterval) => void;
}

const ConfirmBookingTime = ({
  date,
  room,
  start,
  end,
  onStartChange,
  onEndChange,
  onCancel,
  onConfirm,
}: ConfirmBookingTimeProps) => {
  const { t } = useTranslation("booking");
  const interval: BookingInterval | null = start && end ? { start, end } : null;
  const canContinue = canConfirmBookingTime(room, interval);

  return (
    <Modal
      footer={
        <>
          <Button onClick={onCancel} size="sm" variant="outline">
            {t("confirmBookingTime.cancel")}
          </Button>
          <Button
            disabled={!canContinue}
            onClick={() => {
              if (interval && canContinue) {
                onConfirm(interval);
              }
            }}
            size="sm"
            variant="primary"
          >
            {t("confirmBookingTime.confirm")}
          </Button>
        </>
      }
      isOpen
      onClose={onCancel}
      title={t("confirmBookingTime.title")}
    >
      <div className="flex flex-wrap gap-4">
        <DatePicker
          clearable={false}
          disabled
          id="confirm-booking-date"
          label={t("confirmBookingTime.date")}
          value={toDatePickerValue(date)}
          wrapperClassName="w-[148px] shrink-0"
        />
        <TimePicker
          ampm
          id="confirm-booking-start"
          label={t("confirmBookingTime.start")}
          onChange={(value) => onStartChange(fromTimePickerValue(value))}
          value={toTimePickerValue(start)}
          wrapperClassName="w-[148px] shrink-0"
        />
        <TimePicker
          ampm
          id="confirm-booking-end"
          label={t("confirmBookingTime.end")}
          onChange={(value) => onEndChange(fromTimePickerValue(value))}
          value={toTimePickerValue(end)}
          wrapperClassName="w-[148px] shrink-0"
        />
      </div>
    </Modal>
  );
};

export default ConfirmBookingTime;
