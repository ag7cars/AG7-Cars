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

// A simplified low-slung sports-car silhouette — a background
// atmosphere element, not a literal illustration, so rough
// proportions are fine as long as it reads as "a car" in motion.
function CarSilhouette() {
  return (
    <svg viewBox="0 0 300 100" className="h-full w-full" fill="currentColor">
      <path d="M8,78 C8,78 16,54 42,48 L66,32 C86,18 128,13 158,17 L198,24 C218,27 232,34 246,49 L278,54 C289,56 294,64 294,72 L294,79 C294,84 289,87 284,87 L268,87 C268,74 258,64 246,64 C234,64 224,74 224,87 L88,87 C88,74 78,64 66,64 C54,64 44,74 44,87 L18,87 C12,87 8,83 8,78 Z" />
      <circle cx="66" cy="87" r="15" />
      <circle cx="246" cy="87" r="15" />
    </svg>
  );
}

const stats: StatProps[] = [
  { value: 2023, label: "Established" },
  { value: 70, suffix: "+", label: "Cars Delivered" },
  { value: 50, suffix: "+", label: "Happy Customers" },
  { value: 15, suffix: "+", label: "Premium Brands" },
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

        {/* Car sweep — silhouette + trailing speed-streak crossing
            left to right, then fading as the stats take over. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 flex h-16 -translate-y-1/2 items-center transition-[transform,opacity] ease-[cubic-bezier(0.4,0,0.2,1)] sm:h-20"
          style={{
            transform: driving ? "translateX(115vw)" : "translateX(-40vw)",
            transitionDuration: `${DRIVE_DURATION_MS}ms`,
            opacity: revealed ? 0 : 1,
            transitionProperty: "transform, opacity",
          }}
        >
          <div className="h-px w-24 shrink-0 bg-gradient-to-r from-transparent to-white/40 sm:w-36" />
          <div className="h-12 w-32 shrink-0 text-white/50 sm:h-16 sm:w-40">
            <CarSilhouette />
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
