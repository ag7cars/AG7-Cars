"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CoverflowCarouselProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  /**
   * Render one card's visuals. `isFront` tells you whether this is
   * the currently active (front, fully interactive) card — the
   * caller decides what that means (wrap in a Link, enable video
   * controls, etc). Non-front cards are automatically made
   * click-to-select by the carousel itself. `side` is which way the
   * card sits (1 = right, -1 = left, 0 = front/center).
   */
  renderCard: (item: T, isFront: boolean, side: -1 | 0 | 1) => React.ReactNode;
  /** Auto-advance interval in ms. Defaults to 4000. */
  autoAdvanceMs?: number;
  /** Externally-controlled pause, e.g. while a video is playing. */
  paused?: boolean;
  /** Card width classes. Defaults match the other carousels. */
  widthClass?: string;
  /** Card aspect-ratio class. Defaults to aspect-[3/4]. */
  aspectClass?: string;
  emptyMessage?: string;
  /** Called whenever the front (active) card changes, including on mount. */
  onActiveIndexChange?: (index: number) => void;
  /** How many cards peek on each side of the front one. Defaults to 2. */
  range?: number;
  /** Soft-focus blur on the background cards for extra depth. Defaults to false. */
  blurSideCards?: boolean;
};

/*
  3D coverflow: the front card faces the viewer straight on; up to
  `range` cards on each side tilt away in real CSS perspective
  (rotateY), shrinking and fading the further out they are —
  mirrored symmetrically left/right rather than a one-directional
  fan. Advances on its own, or swipe (or click a side
  card) to change it manually — no visible arrow/dot controls.
*/
export default function CoverflowCarousel<T>({
  items,
  getKey,
  renderCard,
  autoAdvanceMs = 4000,
  paused: externalPaused = false,
  widthClass = "w-[220px] sm:w-64 lg:w-72",
  aspectClass = "aspect-[3/4]",
  emptyMessage,
  onActiveIndexChange,
  range = 2,
  blurSideCards = false,
}: CoverflowCarouselProps<T>) {
  const [active, setActive] = useState(0);
  const [touchPaused, setTouchPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = items.length;
  const paused = externalPaused || touchPaused;

  useEffect(() => {
    onActiveIndexChange?.(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActive(((index % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1 || paused) return;

    const timer = setInterval(() => {
      setActive((current) => (current + 1) % count);
    }, autoAdvanceMs);

    return () => clearInterval(timer);
  }, [count, paused, autoAdvanceMs]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    setTouchPaused(true);
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;

    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) goTo(active + 1);
      else goTo(active - 1);
    }

    touchStartX.current = null;
    setTouchPaused(false);
  }

  if (count === 0) {
    return emptyMessage ? (
      <div className="mt-8 rounded-3xl border border-white/5 bg-white/[0.03] px-8 py-16 text-center">
        <p className="text-white/50">{emptyMessage}</p>
      </div>
    ) : null;
  }

  return (
    <div className="relative mt-10" style={{ perspective: "1400px" }}>
      <div
        className={`coverflow-3d relative mx-auto ${aspectClass} ${widthClass}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((item, index) => {
          // Signed circular distance from the active index — items
          // ahead land as positive (right), items behind as negative
          // (left), so the card mirrors symmetrically instead of
          // only fanning one direction.
          const rawOffset = (index - active + count) % count;
          const signedOffset = rawOffset > count / 2 ? rawOffset - count : rawOffset;
          if (Math.abs(signedOffset) > range) return null;

          const isFront = signedOffset === 0;
          const magnitude = Math.abs(signedOffset);
          const side = signedOffset === 0 ? 0 : signedOffset > 0 ? 1 : -1;

          // Spread/rotation/scale/opacity all read from a magnitude
          // capped at 4 rather than the real (possibly much larger,
          // with `range` raised to show a whole 20-item list) one —
          // past that they'd keep growing forever and run off-screen,
          // invert past zero scale, or go negative on opacity. Cards
          // beyond the cap end up visually stacked at the same
          // outermost spot instead, like the rest of a fanned deck
          // peeking from behind the closest few; zIndex still uses
          // the real magnitude so nearer cards stay on top.
          const visualMagnitude = Math.min(magnitude, 4);
          const opacity = magnitude === 0 ? 1 : Math.max(0.75 - (visualMagnitude - 1) * 0.2, 0.3);
          const blurPx = blurSideCards && magnitude > 0 ? visualMagnitude * 2.5 : 0;
          const zIndex = 100 - magnitude;

          // The spread/rotation/scale for background cards are built
          // from CSS custom properties (--cf-spread-base etc., set on
          // the .coverflow-3d container below and overridden under a
          // max-width media query in globals.css) rather than a JS
          // viewport check — a plain CSS media query resolves at
          // paint time with no client-only re-render, so there's no
          // flash of the desktop spacing before it corrects itself.
          const transform =
            magnitude === 0
              ? "translateX(0%) rotateY(0deg) scale(1)"
              : `translateX(calc(${side} * (var(--cf-spread-base) * 1% + ${
                  visualMagnitude - 1
                } * var(--cf-spread-step) * 1%))) rotateY(calc(${-side} * (28deg + ${visualMagnitude} * var(--cf-rotate-extra) * 1deg))) scale(calc(1 - ${visualMagnitude} * var(--cf-scale-step)))`;

          const card = renderCard(item, isFront, side);

          // Always the same element here regardless of isFront — if
          // this branched between rendering `card` directly and
          // wrapping it in a <button>, React would see a changed
          // element type at this position on every front/back flip
          // and remount the whole subtree (including the <Image>
          // inside), which is what caused the blank flash and made
          // side cards seem to disappear mid-transition.
          return (
            <div
              key={getKey(item)}
              role={isFront ? undefined : "button"}
              aria-label={isFront ? undefined : "Show this item"}
              onClick={isFront ? undefined : () => goTo(index)}
              className="absolute inset-0 shadow-2xl"
              style={{
                transform,
                filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                opacity,
                zIndex,
                cursor: isFront ? undefined : "pointer",
                transition:
                  "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1), filter 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "transform, opacity",
              }}
            >
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
