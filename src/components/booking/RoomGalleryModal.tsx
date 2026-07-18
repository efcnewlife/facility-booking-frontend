import { cn } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdChevronLeft, MdChevronRight, MdClose } from "react-icons/md";

interface RoomGalleryModalProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

const RoomGalleryModal = ({ images, initialIndex = 0, isOpen, onClose }: RoomGalleryModalProps) => {
  const { t } = useTranslation("booking");
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(initialIndex);
    }
  }, [initialIndex, isOpen]);

  const goPrevious = useCallback(() => {
    setActiveIndex((index) => (index === 0 ? images.length - 1 : index - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setActiveIndex((index) => (index === images.length - 1 ? 0 : index + 1));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft") {
        goPrevious();
      }
      if (event.key === "ArrowRight") {
        goNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [goNext, goPrevious, isOpen, onClose]);

  if (!isOpen || images.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-dark/60 px-4 py-8" role="dialog">
      <button
        aria-label={t("gallery.close")}
        className="absolute right-6 top-24 text-5xl font-light text-white/90 transition-opacity hover:opacity-80 sm:right-12"
        onClick={onClose}
        type="button"
      >
        <MdClose />
      </button>

      <div className="relative w-full max-w-5xl">
        <div className="relative overflow-hidden rounded-lg bg-booking-grey">
          <img alt="" className="mx-auto max-h-[70vh] w-full object-contain" src={images[activeIndex]} />
        </div>

        {images.length > 1 && (
          <>
            <button
              aria-label={t("gallery.previous")}
              className="absolute left-0 top-1/2 -translate-y-1/2 text-white/80 transition-opacity hover:opacity-100 sm:-left-16"
              onClick={goPrevious}
              type="button"
            >
              <MdChevronLeft className="size-16 sm:size-24" />
            </button>
            <button
              aria-label={t("gallery.next")}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-white/80 transition-opacity hover:opacity-100 sm:-right-16"
              onClick={goNext}
              type="button"
            >
              <MdChevronRight className="size-16 sm:size-24" />
            </button>

            <div className="mt-6 flex items-center justify-center gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  aria-label={`Image ${index + 1}`}
                  className={cn(
                    "size-2.5 rounded-full transition-colors",
                    index === activeIndex ? "bg-primary" : "bg-white/70",
                  )}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoomGalleryModal;
