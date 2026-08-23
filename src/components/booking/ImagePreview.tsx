import { canOpenImagePreview, nextPreviewIndex, previousPreviewIndex } from "@/utils/imagePreview";
import { Button, cn } from "@efcnewlife/newlife-ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdArrowBack, MdArrowForward, MdClose } from "react-icons/md";

interface ImagePreviewProps {
  photoUrls: string[];
  onClose: () => void;
}

const ImagePreview = ({ photoUrls, onClose }: ImagePreviewProps) => {
  const { t } = useTranslation("booking");
  const [index, setIndex] = useState(0);
  const showNav = photoUrls.length > 1;
  const currentUrl = photoUrls[index];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => previousPreviewIndex(current, photoUrls.length));
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => nextPreviewIndex(current, photoUrls.length));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, photoUrls.length]);

  if (!canOpenImagePreview(photoUrls) || !currentUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-booking-primary/40 px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-label={t("imagePreview.dialog")}
        className="relative w-full max-w-[720px] overflow-hidden rounded-sm bg-surface shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="relative bg-booking-grey">
          <img alt="" className="mx-auto max-h-[70vh] w-full object-contain" src={currentUrl} />
          <button
            aria-label={t("imagePreview.close")}
            className="absolute right-3 top-3 flex size-[30px] items-center justify-center text-white"
            onClick={onClose}
            type="button"
          >
            <MdClose size={30} />
          </button>
        </div>
        {showNav ? (
          <div className="flex items-center justify-between gap-4 bg-booking-primary px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
              {photoUrls.map((url, thumbIndex) => (
                <button
                  aria-current={thumbIndex === index ? "true" : undefined}
                  aria-label={t("imagePreview.thumb", { index: thumbIndex + 1 })}
                  className={cn(
                    "size-10 shrink-0 overflow-hidden rounded-sm border-2",
                    thumbIndex === index ? "border-white" : "border-transparent opacity-70"
                  )}
                  key={`${url}-${thumbIndex}`}
                  onClick={() => setIndex(thumbIndex)}
                  type="button"
                >
                  <img alt="" className="size-full object-cover" src={url} />
                </button>
              ))}
            </div>
            <div className="flex shrink-0 gap-3">
              <Button
                className="min-w-10"
                onClick={() => setIndex((current) => previousPreviewIndex(current, photoUrls.length))}
                size="xs"
                startIcon={<MdArrowBack size={16} />}
              >
                <span className="sr-only">{t("imagePreview.previous")}</span>
              </Button>
              <Button
                className="min-w-10"
                onClick={() => setIndex((current) => nextPreviewIndex(current, photoUrls.length))}
                size="xs"
                startIcon={<MdArrowForward size={16} />}
              >
                <span className="sr-only">{t("imagePreview.next")}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default ImagePreview;
