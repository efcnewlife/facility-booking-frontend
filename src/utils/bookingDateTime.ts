import moment from "moment";

export const combineDateAndClock = (date: string, clock: string): string => {
  const time = clock === "24:00" ? "00:00" : clock;
  const day = clock === "24:00" ? moment(date, "YYYY-MM-DD").add(1, "day") : moment(date, "YYYY-MM-DD");
  return moment(`${day.format("YYYY-MM-DD")} ${time}`, "YYYY-MM-DD HH:mm").toISOString();
};

export const clockFromDateTime = (date: string, isoDateTime: string): string => {
  const parsed = moment(isoDateTime);
  if (parsed.format("YYYY-MM-DD") !== date) {
    return "24:00";
  }
  return parsed.format("HH:mm");
};
