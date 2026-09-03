import moment from "moment";

export const combineDateAndClock = (date: string, clock: string): string => {
  const time = clock === "24:00" ? "00:00" : clock;
  const day = clock === "24:00" ? moment(date, "YYYY-MM-DD").add(1, "day") : moment(date, "YYYY-MM-DD");
  return moment(`${day.format("YYYY-MM-DD")} ${time}`, "YYYY-MM-DD HH:mm").toISOString();
};
