import { Alert } from "@efcnewlife/newlife-ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

const REDIRECT_SECONDS = 5;
const BOOK_NOW_PATH = "/start-booking";

const InvalidRoomsDateNotice = () => {
  const { t } = useTranslation("booking");
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate(BOOK_NOW_PATH, { replace: true });
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [navigate, secondsLeft]);

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-4 sm:px-6 lg:px-12">
      <div aria-live="polite" role="status">
        <Alert
          message={t("timetable.invalidDate.message", { count: secondsLeft })}
          title={t("timetable.invalidDate.title")}
          variant="warning"
          width="full"
        />
      </div>
    </main>
  );
};

export default InvalidRoomsDateNotice;
