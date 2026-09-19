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
  /** How many cards peek on each side of the front one — mobile/
      tablet only (desktop always uses a fixed, sane number of its
      own; see DESKTOP_RANGE). Defaults to 2, same as before the
      desktop fix. */
  range?: number;
  /** Soft-focus blur on the background cards for extra depth. Defaults to false. */
  blurSideCards?: boolean;
};

// The mobile/tablet fan (below DESKTOP_QUERY) deliberately keeps its
// original look untouched — same capped-magnitude tilt/scale math as
// before the desktop fix, on request. Only sm+ screens get the
// corrected uniform-spacing, no-tilt version below.
const DESKTOP_QUERY = "(min-width: 640px)";
const MOBILE_SPREAD_BASE = 42;
const MOBILE_SPREAD_STEP = 24;
const MOBILE_ROTATE_EXTRA = 6;
const MOBILE_SCALE_STEP = 0.16;

// Gentle per-step size taper — front card at 100%, each card further
// out a bit smaller, floored so it can never invert past zero.
const SCALE_STEP = 0.12;
const MIN_SCALE = 0.4;

// Desktop always fans out this many cards on each side, regardless of
// what the `range` prop says — that prop's real job now is sizing the
// *mobile* fan (see DESKTOP_QUERY above), where callers still pass
// e.g. items.length to keep every item peeking, exactly as before.
const DESKTOP_RANGE = 3;

function scaleForMagnitude(magnitude: number) {
  return Math.max(1 - magnitude * SCALE_STEP, MIN_SCALE);
}

// Visible edge-to-edge gap between adjacent cards, as a percentage of
// the front card's own (unscaled) width — held constant regardless of
// how much smaller the cards on either side of that gap are.
const EDGE_GAP_PERCENT = 6;

// Cumulative center offset (in % of the front card's own width) for a
// card `magnitude` steps out — each step adds exactly that step's two
// half-widths plus the fixed edge gap, so however much the cards
// shrink, the *visible* gap between any two neighboring cards is
// always the same EDGE_GAP_PERCENT, and no two cards can ever land on
// top of each other (unlike reusing one capped "visual magnitude" for
// every card past a certain depth, which put them all at the same
// spot). Only ever called with `magnitude` up to `range`, which the
// caller is expected to keep small (a handful, not the whole list).
function offsetPercentForMagnitude(magnitude: number) {
  let offset = 0;
  for (let step = 1; step <= magnitude; step++) {
    offset += 50 * scaleForMagnitude(step - 1) + EDGE_GAP_PERCENT + 50 * scaleForMagnitude(step);
  }
  return offset;
}

/*
  Center-focused fan: the front card faces the viewer at full size;
  up to `range` cards on each side sit progressively smaller and
  dimmer, spaced so the visible gap between any two neighbors is
  always the same regardless of how small they've gotten. No 3D tilt
  — cards only translate and scale, so the vehicle photo inside never
  skews. Advances on its own; touch devices swipe to change it
  manually, while sm+ screens (mouse/trackpad, no swipe gesture) get
  visible prev/next arrows and dot indicators instead.
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

  // Defaults to the mobile/tablet layout (matches server-rendered
  // markup) and upgrades to the desktop one once measured client-side
  // — the carousel sits below the fold on every page that uses it, so
  // by the time it's actually scrolled into view this has long since
  // resolved; there's no risk of a visible layout flash.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(mq.matches);
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

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
    <div className="relative mt-10" style={{ perspective: isDesktop ? undefined : "1400px" }}>
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
          const effectiveRange = isDesktop ? DESKTOP_RANGE : range;
          if (Math.abs(signedOffset) > effectiveRange) return null;

          const isFront = signedOffset === 0;
          const magnitude = Math.abs(signedOffset);
          const side = signedOffset === 0 ? 0 : signedOffset > 0 ? 1 : -1;
          const zIndex = 100 - magnitude;

          let opacity: number;
          let blurPx: number;
          let transform: string;

          if (isDesktop) {
            const scale = scaleForMagnitude(magnitude);
            opacity = Math.max(0.85 - (magnitude - 1) * 0.15, 0.5);
            blurPx = blurSideCards ? magnitude * 1.5 : 0;
            transform = `translateX(${side * offsetPercentForMagnitude(magnitude)}%) scale(${scale})`;
          } else {
            // Original mobile/tablet math, unchanged: one shared
            // magnitude (capped at 4) drives spread, tilt and scale
            // together.
            const visualMagnitude = Math.min(magnitude, 4);
            opacity = magnitude === 0 ? 1 : Math.max(0.75 - (visualMagnitude - 1) * 0.2, 0.3);
            blurPx = blurSideCards && magnitude > 0 ? visualMagnitude * 2.5 : 0;
            transform =
              magnitude === 0
                ? "translateX(0%) rotateY(0deg) scale(1)"
                : `translateX(${side * (MOBILE_SPREAD_BASE + (visualMagnitude - 1) * MOBILE_SPREAD_STEP)}%) rotateY(${
                    -side * (28 + visualMagnitude * MOBILE_ROTATE_EXTRA)
                  }deg) scale(${Math.max(1 - visualMagnitude * MOBILE_SCALE_STEP, 0)})`;
          }

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
