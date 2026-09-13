"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VISIBLE_DEPTH = 3;

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
  Swipe or use the arrows/dots to advance. Built with only 2D
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
          // left — a clearly visible peek on both sides.
          const side = layoutDepth === 0 ? 0 : layoutDepth % 2 === 1 ? 1 : -1;
          const fanXPercent = layoutDepth === 0 ? 0 : side * (18 + layoutDepth * 8);
          const rotateDeg = layoutDepth === 0 ? 0 : side * (5 + layoutDepth * 2);
          const translateY = layoutDepth === 0 ? 0 : 8 + layoutDepth * 4;
          const scale = 1 - layoutDepth * 0.08;
          const opacity = hidden ? 0 : layoutDepth === 0 ? 1 : 0.9 - layoutDepth * 0.2;
          const zIndex = hidden ? 0 : VISIBLE_DEPTH - layoutDepth;

          const card = renderCard(item, isFront, side);

          return (
            <div
              key={getKey(item)}
              className="absolute inset-0"
              aria-hidden={hidden || undefined}
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
                transition:
                  "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "transform, opacity",
                backfaceVisibility: "hidden",
              }}
            >
              {isFront ? (
                card
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label="Show this item"
                  className="block h-full w-full appearance-none border-0 bg-transparent p-0"
                  tabIndex={-1}
                >
                  {card}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="Previous"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition-colors duration-300 hover:border-white hover:bg-white hover:text-black"
          >
            ←
          </button>

          <div className="flex items-center gap-2">
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

          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="Next"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition-colors duration-300 hover:border-white hover:bg-white hover:text-black"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
