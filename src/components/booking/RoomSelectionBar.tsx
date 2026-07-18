import type { Room } from "@/types/booking";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { MdAdd } from "react-icons/md";

interface RoomSelectionBarProps {
  selectedRooms: Room[];
  maxSelection?: number;
  onSeeAvailability?: () => void;
}

const RoomSelectionBar = ({ selectedRooms, maxSelection = 3, onSeeAvailability }: RoomSelectionBarProps) => {
  const { t } = useTranslation("booking");
  const slots = Array.from({ length: maxSelection }, (_, index) => selectedRooms[index] ?? null);
  const hasSelection = selectedRooms.length > 0;

  return (
    <div className="rounded-[16px] bg-surface p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {slots.map((room, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex w-[150px] flex-col items-center sm:w-[190px]">
                <div
                  className={cn(
                    "flex h-[110px] w-full items-center justify-center rounded-sm",
                    room ? "bg-booking-text" : "bg-booking-light-grey",
                  )}
                >
                  {!room && (
                    <span className="px-3 text-center text-sm font-medium text-on-surface-variant">
                      {t("multiRoom.selectRoomToAdd")}
                    </span>
                  )}
                </div>
              </div>
              {index < maxSelection - 1 && <MdAdd className="hidden size-9 text-on-surface-variant sm:block" />}
            </div>
          ))}
        </div>

        <button
          className="h-9 min-w-[130px] self-center rounded-[24px] bg-cta px-3 text-sm font-bold text-on-cta transition-colors hover:bg-cta-hover hover:text-on-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasSelection}
          onClick={onSeeAvailability}
          type="button"
        >
          {t("room.seeAvailability")}
        </button>
      </div>
    </div>
  );
};

export default RoomSelectionBar;
