import { canConfirmBookingTime, type BookingInterval, type RoomDay } from "@/utils/timetableRules";
import { Button, Modal, TimePicker, type TimePickerValue } from "@efcnewlife/newlife-ui";
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
      className="mx-4 w-full max-w-md p-6"
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
      <div className="flex flex-col gap-4">
        <p className="m-0 text-lg text-on-surface">
          <span className="font-medium">{t("confirmBookingTime.date")}: </span>
          <span>{date}</span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <TimePicker
            ampm
            id="confirm-booking-start"
            label={t("confirmBookingTime.start")}
            onChange={(value) => onStartChange(fromTimePickerValue(value))}
            value={toTimePickerValue(start)}
            wrapperClassName="w-full min-w-0"
          />
          <TimePicker
            ampm
            id="confirm-booking-end"
            label={t("confirmBookingTime.end")}
            onChange={(value) => onEndChange(fromTimePickerValue(value))}
            value={toTimePickerValue(end)}
            wrapperClassName="w-full min-w-0"
          />
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmBookingTime;
