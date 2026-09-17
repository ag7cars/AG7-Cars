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
   * card sits (1 = right, -1 = left, 0 = front/center). `distance` is
   * how many cards away from front this is (0 for the front card
   * itself) — useful for deciding how eagerly to load heavy media
   * (e.g. only fully preload a video within a couple cards of front).
   */
  renderCard: (item: T, isFront: boolean, side: -1 | 0 | 1, distance: number) => React.ReactNode;
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
  /** How many cards peek on each side of the front one. Defaults to
      3 — each one sits a fixed card-width-plus-gap further out, so a
      larger range just pushes the outermost cards proportionally
      further from center (most will sit off past the section's own
      width). Keep this to a handful regardless of how many items
      there are; the rest are still reachable via the dots/arrows and
      auto-advance, just not simultaneously laid out on screen. */
  range?: number;
  /** Soft-focus blur on the background cards for extra depth. Defaults to false. */
  blurSideCards?: boolean;
};

/*
  Peek carousel: the front card sits centered at full, normal size;
  up to `range` cards on each side sit beside it at that exact same
  size, spaced a fixed card-width-plus-gap apart so they never
  overlap or shrink — only dimming with distance for focus. (An
  earlier version tilted/scaled cards away in 3D, coverflow-style,
  but shrinking cards toward a shared vanishing point meant distant
  ones crowded together and visually overlapped — exactly what this
  avoids by construction: same size, fixed spacing, never touching.)
  Advances on its own; touch devices swipe to change it manually,
  while sm+ screens (mouse/trackpad, no swipe gesture) get visible
  prev/next arrows and dot indicators instead.
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
  range = 3,
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
    <div className="relative mt-10">
      <div
        className={`relative mx-auto ${aspectClass} ${widthClass}`}
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

          // Only opacity carries the "this isn't the front card" cue
          // now — every card renders at the same normal size, so
          // there's nothing left to shrink into overlap with its
          // neighbor.
          const opacity = magnitude === 0 ? 1 : Math.max(0.85 - (magnitude - 1) * 0.15, 0.45);
          const blurPx = blurSideCards && magnitude > 0 ? magnitude * 1.5 : 0;
          const zIndex = 100 - magnitude;

          // Each step over is exactly one card-width-plus-gap (in %
          // of the card's own width, so it already accounts for
          // however wide `widthClass` makes it at this breakpoint) —
          // cards line up edge-to-edge with a fixed gap between them
          // and never overlap, unlike a coverflow's shrink-toward-a-
          // vanishing-point spacing where farther cards close in on
          // each other.
          const gapPercent = 6;
          const transform =
            magnitude === 0
              ? "translateX(0%)"
              : `translateX(${side * magnitude * (100 + gapPercent)}%)`;

          const card = renderCard(item, isFront, side, magnitude);

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

      {count > 1 && (
        <div className="relative z-10 mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="Previous"
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition-colors duration-300 hover:border-white hover:bg-white hover:text-black sm:flex"
          >
            ←
          </button>

          {/* Dots stay visible at every width — touch screens don't
              get the arrows (swipe covers that), but still need some
              way to see which card is active. The active dot lifts
              up slightly instead of just widening, so it reads at a
              glance even at this small size. */}
          <div className="flex items-end gap-2">
            {items.map((item, index) => (
              <button
                key={getKey(item)}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Go to item ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === active ? "w-6 -translate-y-1 bg-white" : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="Next"
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition-colors duration-300 hover:border-white hover:bg-white hover:text-black sm:flex"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
