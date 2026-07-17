"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";

export interface LightboxProps {
  photos: string[];
  schoolName: string;
  open: boolean;
  index: number;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
  /** Focus restore on close (dialog is opened programmatically, not via a Radix trigger). */
  onCloseAutoFocus?: (event: Event) => void;
}

/** Full-screen photo viewer: arrows + keyboard + swipe navigation. */
export function Lightbox({
  photos,
  schoolName,
  open,
  index,
  onOpenChange,
  onIndexChange,
  onCloseAutoFocus,
}: LightboxProps) {
  const count = photos.length;
  const current = photos[index];
  const [errored, setErrored] = React.useState<Set<string>>(new Set());
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);

  const goTo = React.useCallback(
    (next: number) => {
      if (count > 0) onIndexChange(((next % count) + count) % count);
    },
    [count, onIndexChange]
  );

  // Preload neighbours so arrow navigation feels instant.
  React.useEffect(() => {
    if (!open || count < 2) return;
    [index - 1, index + 1].forEach((i) => {
      const src = photos[((i % count) + count) % count];
      if (src) {
        const img = new window.Image();
        img.src = src;
      }
    });
  }, [open, index, count, photos]);

  const closeOnSelfClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onOpenChange(false);
  };

  if (count === 0) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="mk-root mk-lightbox__overlay" />
        <DialogPrimitive.Content
          className="mk-root mk-lightbox"
          aria-describedby={undefined}
          onCloseAutoFocus={onCloseAutoFocus}
          onKeyDown={(e) => {
            if (count < 2) return;
            if (e.key === "ArrowRight") {
              e.preventDefault();
              goTo(index + 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              goTo(index - 1);
            }
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>
              {schoolName} — photo {index + 1} of {count}
            </DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="mk-lightbox__bar">
            {count > 1 ? (
              <span className="mk-lightbox__count" aria-hidden="true">
                {index + 1} / {count}
              </span>
            ) : (
              <span />
            )}
            <DialogPrimitive.Close
              className="mk-lightbox__btn"
              aria-label="Close photo viewer"
            >
              <X size={20} />
            </DialogPrimitive.Close>
          </div>

          <div
            className="mk-lightbox__stage"
            onClick={closeOnSelfClick}
            onTouchStart={(e) => {
              touchStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }}
            onTouchEnd={(e) => {
              const start = touchStart.current;
              touchStart.current = null;
              if (!start || count < 2) return;
              const dx = e.changedTouches[0].clientX - start.x;
              const dy = e.changedTouches[0].clientY - start.y;
              if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
                goTo(dx < 0 ? index + 1 : index - 1);
              }
            }}
          >
            {count > 1 && (
              <button
                type="button"
                className="mk-lightbox__btn mk-lightbox__nav mk-lightbox__nav--prev"
                aria-label="Previous photo"
                onClick={() => goTo(index - 1)}
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <div className="mk-lightbox__figure" onClick={closeOnSelfClick}>
              {current && !errored.has(current) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={current}
                  className="mk-lightbox__img"
                  src={current}
                  alt={`${schoolName} — photo ${index + 1} of ${count}`}
                  onError={() =>
                    setErrored((prev) => new Set(prev).add(current))
                  }
                />
              ) : (
                <span className="mk-lightbox__broken">
                  <ImageIcon size={30} />
                  Photo unavailable
                </span>
              )}
            </div>

            {count > 1 && (
              <button
                type="button"
                className="mk-lightbox__btn mk-lightbox__nav mk-lightbox__nav--next"
                aria-label="Next photo"
                onClick={() => goTo(index + 1)}
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          <p className="mk-lightbox__caption">{schoolName}</p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
