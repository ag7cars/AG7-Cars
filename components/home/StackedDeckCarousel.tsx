"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// High enough that every item in a full 20-card list stays mounted
// and fanned out (rather than only the front few) — the fan/scale
// math below is capped independently, so raising this no longer
// pushes deep cards off-screen or into a negative scale.
const VISIBLE_DEPTH = 20;

export type StackedDeckCarouselProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  /**
   * Render one card's visuals. `isFront` tells you whether this is
   * the currently active (front, fully interactive) card — the
   * caller decides what that means (wrap in a Link, enable video
   * controls, etc). Non-front cards are automatically made
   * click-to-select by the carousel itself. `side` is which way the
   * card is fanned out (1 = right, -1 = left, 0 = front/center) —
   * useful for mirroring a card's internal layout so its label stays
   * on the outer edge regardless of which side it peeks from.
   */
  renderCard: (item: T, isFront: boolean, side: -1 | 0 | 1) => React.ReactNode;
  /** Auto-advance interval in ms. Defaults to 4000. */
  autoAdvanceMs?: number;
  /** Externally-controlled pause, e.g. while a video is playing. */
  paused?: boolean;
  /** Card width classes. Defaults match the Collection carousel. */
  widthClass?: string;
  /** Card aspect-ratio class. Defaults to aspect-[3/4]. */
  aspectClass?: string;
  emptyMessage?: string;
  /** Called whenever the front (active) card changes, including on mount. */
  onActiveIndexChange?: (index: number) => void;
};

/*
  Stacked-deck carousel: the front item is fully visible; the next
  couple fan out from behind it (slightly smaller, rotated, faded).
  Swipe or use the dots to advance. Built with only 2D
  transforms (translate + rotate + scale) — no perspective or
  rotateY — since that's the one combination that has reliably
  rendered on every real device tested so far.
*/
export default function StackedDeckCarousel<T>({
  items,
  getKey,
  renderCard,
  autoAdvanceMs = 4000,
  paused: externalPaused = false,
  widthClass = "w-[220px] sm:w-64 lg:w-72",
  aspectClass = "aspect-[3/4]",
  emptyMessage,
  onActiveIndexChange,
}: StackedDeckCarouselProps<T>) {
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
    <div className="relative mt-8">
      <div
        className={`relative mx-auto ${aspectClass} ${widthClass}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((item, index) => {
          const depth = (index - active + count) % count;
          const isFront = depth === 0;
          // Cards beyond the visible fan stay mounted (rather than
          // being removed from the DOM) so a video already has its
          // buffer warm by the time it cycles back to the front —
          // unmounting/remounting was forcing every re-appearance to
          // re-fetch and re-decode from scratch, showing a blank
          // frame until it caught up. They're just faded out and
          // click-disabled instead.
          const hidden = depth >= VISIBLE_DEPTH;
          const layoutDepth = Math.min(depth, VISIBLE_DEPTH);

          // Front card centered; depth 1 fans right, depth 2 fans
          // left, alternating — every card gets a slot instead of
          // just the first couple. The offset/rotation/scale all
          // taper off with Math.min/Math.max caps instead of growing
          // linearly forever, so a 20-card fan converges into a
          // tight, mostly-overlapped stack at each edge rather than
          // running off-screen or inverting past zero scale.
          const side = layoutDepth === 0 ? 0 : layoutDepth % 2 === 1 ? 1 : -1;
          const fanXPercent = layoutDepth === 0 ? 0 : side * Math.min(18 + layoutDepth * 8, 60);
          const rotateDeg = layoutDepth === 0 ? 0 : side * Math.min(5 + layoutDepth * 2, 22);
          const translateY = layoutDepth === 0 ? 0 : Math.min(8 + layoutDepth * 4, 36);
          const scale = Math.max(1 - layoutDepth * 0.08, 0.55);
          const opacity = hidden
            ? 0
            : layoutDepth === 0
              ? 1
              : Math.max(0.9 - layoutDepth * 0.12, 0.35);
          const zIndex = hidden ? 0 : count - layoutDepth;

          const card = renderCard(item, isFront, side);

          return (
            <div
              key={getKey(item)}
              className="absolute inset-0"
              aria-hidden={hidden || undefined}
              // Click-to-select lives directly on this wrapper instead
              // of conditionally wrapping `card` in a <button> only
              // when it's not front — that conditional wrapping used
              // to change the DOM shape around `card` every time a
              // card crossed the front/back boundary, which forced
              // React to unmount and remount the whole subtree
              // (video included) on every single transition, resetting
              // playback and forcing a full reload from scratch each
              // time a video cycled back to front.
              role={isFront ? undefined : "button"}
              aria-label={isFront ? undefined : "Show this item"}
              onClick={isFront ? undefined : () => goTo(index)}
              style={{
                // A single translate3d (rather than separate
                // translateX/translateY) is what reliably pushes
                // mobile browsers onto a GPU-composited layer for
                // the whole transform chain — `will-change` alone
                // isn't always enough to keep this smooth on weaker
                // phone hardware.
                transform: `translate3d(${fanXPercent}%, ${translateY}px, 0) rotate(${rotateDeg}deg) scale(${scale})`,
                opacity,
                zIndex,
                pointerEvents: hidden ? "none" : undefined,
                cursor: isFront ? undefined : "pointer",
                transition:
                  "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "transform, opacity",
                backfaceVisibility: "hidden",
              }}
            >
              {card}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {items.map((item, index) => (
            <button
              key={getKey(item)}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to item ${index + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === active ? "w-6 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
