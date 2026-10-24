import { useEffect, useRef, type RefObject } from "react";

/**
 * While open: focus the initial control, close on Escape, and return focus to whatever
 * had it before the dialog opened once the dialog closes.
 */
export const useDialogFocus = (
  isOpen: boolean,
  initialFocusRef: RefObject<HTMLElement | null>,
  onClose: () => void
): void => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    initialFocusRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [initialFocusRef, isOpen]);
};
