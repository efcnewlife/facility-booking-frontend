import i18n from "@/i18n";
import moment from "moment";

export const format_booking_date = (date: string): string => {
  return moment(date).locale(i18n.language).format("dddd, MMMM D, YYYY");
};

export const format_booking_time_range = (startTime: string, endTime: string): string => {
  const start = moment(startTime, "HH:mm").locale(i18n.language).format("h:mm A");
  const end = moment(endTime, "HH:mm").locale(i18n.language).format("h:mm A");
  return `${start} – ${end}`;
};

export const format_profile_date = (date: string): string => {
  return moment(date).locale(i18n.language).format("MMMM D, YYYY");
};

export const format_currency = (amount: number): string => {
  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency: "USD",
  }).format(amount);
};
