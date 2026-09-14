"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

type StatProps = {
  value: number;
  suffix?: string;
  label: string;
};

// Drives the whole sequence: a car silhouette sweeps across the
// section first, then the stats fade in and start counting once it's
// passed — resets and replays each time the section re-enters view.
const DRIVE_DURATION_MS = 1600;

function useDriveSequence() {
  const ref = useRef<HTMLDivElement>(null);
  const [driving, setDriving] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDriving(true);
          const timer = setTimeout(() => setRevealed(true), DRIVE_DURATION_MS);
          return () => clearTimeout(timer);
        } else {
          setDriving(false);
          setRevealed(false);
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, driving, revealed };
}

function useCountUp(value: number, active: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }

    let frame: number;
    const durationMs = 1200;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      setProgress(easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return Math.round(value * progress);
}

// A hand-drawn F1 silhouette in AG7's own black/white/gold palette —
// no real team livery, sponsor branding, driver number, or helmet, so
// there's nothing here that recreates anyone else's IP. Drawn flat
// rather than photoreal so every shape (including each wheel) is a
// plain SVG primitive we can position and spin exactly.
const AG7_BLACK = "#0a0a0a";
const AG7_WHITE = "#f5f5f5";
const AG7_GOLD = "#e8c874";
const AG7_TIRE = "#1c1c1c";

const REAR_WHEEL_X = 66;
const FRONT_WHEEL_X = 250;
const WHEEL_Y = 70;
const WHEEL_R = 20;

function Wheel({ cx, spinning }: { cx: number; spinning: boolean }) {
  return (
    <g
      style={{
        transformBox: "fill-box",
        transformOrigin: "center",
        animation: spinning ? "ag7-wheel-spin 0.45s linear infinite" : undefined,
      }}
    >
      <circle cx={cx} cy={WHEEL_Y} r={WHEEL_R} fill={AG7_TIRE} />
      <circle cx={cx} cy={WHEEL_Y} r={WHEEL_R - 8} fill="none" stroke={AG7_GOLD} strokeWidth="2" />
      <g stroke={AG7_GOLD} strokeWidth="2" strokeLinecap="round">
        <line x1={cx} y1={WHEEL_Y - 10} x2={cx} y2={WHEEL_Y - 4} />
        <line x1={cx} y1={WHEEL_Y + 4} x2={cx} y2={WHEEL_Y + 10} />
        <line x1={cx - 10} y1={WHEEL_Y} x2={cx - 4} y2={WHEEL_Y} />
        <line x1={cx + 4} y1={WHEEL_Y} x2={cx + 10} y2={WHEEL_Y} />
        <line x1={cx - 8} y1={WHEEL_Y - 6} x2={cx - 4} y2={WHEEL_Y - 3} />
        <line x1={cx + 4} y1={WHEEL_Y + 3} x2={cx + 8} y2={WHEEL_Y + 6} />
        <line x1={cx + 8} y1={WHEEL_Y - 6} x2={cx + 4} y2={WHEEL_Y - 3} />
        <line x1={cx - 4} y1={WHEEL_Y + 3} x2={cx - 8} y2={WHEEL_Y + 6} />
      </g>
      <circle cx={cx} cy={WHEEL_Y} r="3" fill={AG7_GOLD} />
    </g>
  );
}

function F1CarSilhouette({ spinning }: { spinning: boolean }) {
  return (
    <svg viewBox="0 0 340 100" className="h-full w-full overflow-visible">
      {/* contact shadow, grounding the car */}
      <ellipse cx="160" cy="93" rx="150" ry="6" fill="rgba(0,0,0,0.4)" />

      {/* front wing */}
      <rect x="0" y="66" width="44" height="6" rx="1.5" fill={AG7_GOLD} />

      {/* nose, low and pointed, rising back toward the cockpit —
          white with a gold tip accent */}
      <path d="M18,66 L120,44 C128,42 132,38 132,32 L132,66 Z" fill={AG7_WHITE} />
      <path d="M18,66 L58,57 L62,66 Z" fill={AG7_GOLD} />

      {/* windscreen / cockpit opening */}
      <path d="M120,44 C130,41 138,36 140,28 C142,20 148,15 156,14 L156,44 Z" fill={AG7_TIRE} />

      {/* body from the cockpit back through the sidepods to the
          engine cover — black with a gold lower stripe */}
      <path d="M132,66 L176,44 L248,50 C262,51 270,56 272,62 L272,66 Z" fill={AG7_BLACK} />
      <path d="M132,66 L176,53 L248,58 C258,59 264,62 266,66 Z" fill={AG7_GOLD} />

      {/* halo — the protective hoop arching over the cockpit opening */}
      <path
        d="M140,28 C142,18 150,10 160,8 C170,10 176,17 176,26 L176,44"
        fill="none"
        stroke={AG7_TIRE}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* low rear wing */}
      <rect x="272" y="34" width="6" height="24" rx="1.5" fill={AG7_GOLD} />
      <rect x="256" y="30" width="30" height="5" rx="1.5" fill={AG7_GOLD} />

      {/* wheels, exposed and larger than the body, spokes spin while driving */}
      <Wheel cx={REAR_WHEEL_X} spinning={spinning} />
      <Wheel cx={FRONT_WHEEL_X} spinning={spinning} />
    </svg>
  );
}

// Tire smoke — a cluster of blurred, staggered puffs trailing the
// rear wheel. Two intensities: a faint wisp while it's still moving,
// and a fuller billowing cloud once it's parked (as if it just
// screeched to a stop) — and it's meant to stay, not fade back out.
function TireSmoke({ intensity }: { intensity: "none" | "light" | "full" }) {
  const opacity = intensity === "full" ? 1 : intensity === "light" ? 0.5 : 0;

  return (
    <div
      className="pointer-events-none absolute -left-16 bottom-0 h-24 w-44 transition-opacity duration-700 ease-out sm:-left-20 sm:h-28 sm:w-52"
      style={{ opacity }}
    >
      <div className="absolute bottom-0 left-0 h-14 w-14 rounded-full bg-white/22 blur-xl sm:h-16 sm:w-16" />
      <div className="absolute bottom-2 left-8 h-20 w-20 rounded-full bg-white/26 blur-2xl sm:h-24 sm:w-24" />
      <div className="absolute bottom-0 left-20 h-14 w-14 rounded-full bg-white/18 blur-xl sm:left-24 sm:h-16 sm:w-16" />
      <div className="absolute bottom-3 left-28 h-10 w-10 rounded-full bg-white/14 blur-lg sm:left-32 sm:h-12 sm:w-12" />
      <div className="absolute bottom-1 left-36 h-8 w-8 rounded-full bg-white/10 blur-md sm:left-40 sm:h-9 sm:w-9" />
    </div>
  );
}

const stats: StatProps[] = [
  { value: 2023, label: "Established" },
  { value: 120, suffix: "+", label: "Cars Delivered" },
  { value: 100, suffix: "+", label: "Happy Customers" },
  { value: 15, suffix: "+", label: "Brands" },
];

function Stat({ value, suffix = "", label, active }: StatProps & { active: boolean }) {
  const displayValue = useCountUp(value, active);
  return (
    <div className="min-w-0">
      <p className="font-display text-4xl font-semibold tabular-nums leading-none text-white sm:text-5xl">
        {displayValue}
        {suffix}
      </p>
      <span className="mt-4 block h-px w-8 bg-gradient-to-r from-[#e8c874] to-transparent" />
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
    </div>
  );
}

export default function AboutStats() {
  const { ref, driving, revealed } = useDriveSequence();

  return (
    <div className="mt-6">
      <div className="mx-auto max-w-2xl text-center sm:mx-0 sm:text-left">
        <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">
          About Us
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/70 sm:text-base">
          A curated destination for exceptional automobiles — every car
          selected, inspected, and delivered to a standard worthy of
          the drivers who choose them.
        </p>
      </div>

      <div
        ref={ref}
        className="relative mt-10 overflow-hidden rounded-3xl border border-white/5 bg-black px-6 py-12 sm:px-10 sm:py-16"
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-[#e8c874]/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-white/5 blur-[100px]" />

        {/* F1 car — drives in from the left and parks at the right
            edge of this box (not the viewport — "left" resolves
            against this relative container, unlike a transform
            percentage, which is why it's used here instead of
            translateX). It stays put once parked; only the smoke's
            intensity changes afterward, it never fades out. Wheels
            spin while driving and stop once parked. */}
        <div
          className="pointer-events-none absolute top-1/2 z-10 h-16 -translate-y-1/2 sm:h-20"
          style={{
            left: driving ? "calc(100% - 190px)" : "-320px",
            transitionProperty: "left",
            transitionDuration: `${DRIVE_DURATION_MS}ms`,
            transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div className="relative h-full w-32 sm:w-40">
            <F1CarSilhouette spinning={driving && !revealed} />
            <TireSmoke intensity={!driving ? "none" : revealed ? "full" : "light"} />
          </div>
        </div>

        {/* Stats — fade and lift in once the car has passed. */}
        <div
          className="relative grid grid-cols-2 gap-x-8 gap-y-10 transition-all duration-700 ease-out sm:grid-cols-4"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(12px)",
          }}
        >
          {stats.map((stat) => (
            <Stat key={stat.label} {...stat} active={revealed} />
          ))}
        </div>
      </div>
    </div>
  );
}
