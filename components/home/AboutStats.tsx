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

// A simplified F1 silhouette — low nose cone, exposed front/rear
// wheels, a raised cockpit halo, and a rear wing. A background
// atmosphere element, not a literal illustration, so rough
// proportions are fine as long as it reads as "an F1 car".
function F1CarSilhouette() {
  return (
    <svg viewBox="0 0 320 100" className="h-full w-full" fill="currentColor">
      {/* front wing */}
      <rect x="2" y="74" width="44" height="6" rx="2" />
      {/* nose cone */}
      <path d="M22,74 L74,58 C82,55 90,53 90,47 L90,44 C90,41 87,39 84,39 L60,39 C50,39 41,43 34,50 L18,66 Z" />
      {/* sidepod / body running back to the engine cover */}
      <path d="M90,47 L152,42 C166,41 180,41 194,44 L228,51 C237,53 243,58 243,65 L243,73 L98,73 L90,58 Z" />
      {/* cockpit + halo hoop */}
      <path
        d="M150,42 L150,29 C150,21 158,15 168,15 C178,15 186,21 186,29 L186,44"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* engine cover taper to the rear wing mount */}
      <path
        d="M243,65 L282,58 C290,57 296,52 296,45 L296,38"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* rear wing */}
      <rect x="290" y="28" width="7" height="28" rx="2" />
      <rect x="270" y="24" width="42" height="6" rx="2" />
      {/* exposed wheels, sized larger than the body like a real F1 car */}
      <circle cx="58" cy="76" r="20" />
      <circle cx="258" cy="76" r="20" />
    </svg>
  );
}

// Tire smoke — a small cluster of blurred, staggered puffs trailing
// the car. Two intensities: a faint wisp while it's still moving,
// and a fuller cloud once it's parked (as if it just screeched to a
// stop) — and it's meant to stay, not fade back out.
function TireSmoke({ intensity }: { intensity: "none" | "light" | "full" }) {
  const opacity = intensity === "full" ? 1 : intensity === "light" ? 0.45 : 0;

  return (
    <div
      className="pointer-events-none absolute -left-10 bottom-1 h-16 w-28 transition-opacity duration-700 ease-out sm:-left-12 sm:h-20 sm:w-36"
      style={{ opacity }}
    >
      <div className="absolute bottom-0 left-0 h-9 w-9 rounded-full bg-white/25 blur-xl sm:h-11 sm:w-11" />
      <div className="absolute bottom-1 left-7 h-12 w-12 rounded-full bg-white/20 blur-xl sm:h-16 sm:w-16" />
      <div className="absolute bottom-0 left-16 h-8 w-8 rounded-full bg-white/15 blur-lg sm:left-20 sm:h-10 sm:w-10" />
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
            intensity changes afterward, it never fades out. */}
        <div
          className="pointer-events-none absolute top-1/2 z-10 h-16 -translate-y-1/2 sm:h-20"
          style={{
            left: driving ? "calc(100% - 190px)" : "-320px",
            transitionProperty: "left",
            transitionDuration: `${DRIVE_DURATION_MS}ms`,
            transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div className="relative h-full w-32 text-white/60 sm:w-40">
            <F1CarSilhouette />
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
