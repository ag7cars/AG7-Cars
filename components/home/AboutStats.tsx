"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

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

// The actual F1 car artwork (public/images/about-f1-car.jpg) is a
// commissioned, original design — no real team livery, sponsor
// branding, or car number — so it's safe to use as-is rather than
// redrawn as an SVG. It already has motion streaks and tire smoke
// baked in; a spinning overlay on each wheel and an extra trailing
// smoke cluster (see TireSmoke below) layer on top of that.
const CAR_IMAGE_SRC = "/images/about-f1-car.jpg";
const CAR_ASPECT = 900 / 450; // matches the source file exactly

// Percent-of-image-box positions for the two wheel centers, measured
// against the source photo. Written as CSS custom properties so the
// wheel overlay's own size/position math (in WheelSpinner) only has
// to read them, not repeat these numbers.
const REAR_WHEEL = { left: "21.7%", top: "57.3%" };
const FRONT_WHEEL = { left: "79.8%", top: "57.3%" };
const WHEEL_SIZE = { width: "12.2%", height: "24.4%" }; // circular once the box keeps CAR_ASPECT

function WheelSpinner({ position, spinning }: { position: { left: string; top: string }; spinning: boolean }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: position.left,
        top: position.top,
        width: WHEEL_SIZE.width,
        height: WHEEL_SIZE.height,
        transform: "translate(-50%, -50%)",
        animation: spinning ? "ag7-wheel-spin 0.45s linear infinite" : undefined,
      }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g stroke="rgba(255,255,255,0.5)" strokeWidth="7" strokeLinecap="round">
          <line x1="50" y1="8" x2="50" y2="32" />
          <line x1="50" y1="68" x2="50" y2="92" />
          <line x1="8" y1="50" x2="32" y2="50" />
          <line x1="68" y1="50" x2="92" y2="50" />
          <line x1="21" y1="21" x2="38" y2="38" />
          <line x1="62" y1="62" x2="79" y2="79" />
          <line x1="79" y1="21" x2="62" y2="38" />
          <line x1="38" y1="62" x2="21" y2="79" />
        </g>
      </svg>
    </div>
  );
}

function F1CarPhoto({ spinning }: { spinning: boolean }) {
  return (
    <div className="relative h-full" style={{ aspectRatio: CAR_ASPECT }}>
      <Image
        src={CAR_IMAGE_SRC}
        alt="AG7 Cars — F1 car"
        fill
        className="object-contain"
        sizes="(min-width: 640px) 320px, 240px"
      />
      <WheelSpinner position={REAR_WHEEL} spinning={spinning} />
      <WheelSpinner position={FRONT_WHEEL} spinning={spinning} />
    </div>
  );
}

// Extra trailing tire smoke, layered behind the car's own baked-in
// smoke (which sits at the rear wheel) to extend and intensify it.
// Two intensities: a faint wisp while it's still moving, and a
// fuller billowing cloud once it's parked (as if it just screeched
// to a stop) — and it's meant to stay, not fade back out.
function TireSmoke({ intensity }: { intensity: "none" | "light" | "full" }) {
  const opacity = intensity === "full" ? 1 : intensity === "light" ? 0.45 : 0;

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-0 h-20 w-32 -translate-x-[70%] transition-opacity duration-700 ease-out sm:h-24 sm:w-40"
      style={{ opacity }}
    >
      <div className="absolute bottom-0 left-0 h-11 w-11 rounded-full bg-white/25 blur-xl sm:h-14 sm:w-14" />
      <div className="absolute bottom-2 left-8 h-16 w-16 rounded-full bg-white/22 blur-2xl sm:h-20 sm:w-20" />
      <div className="absolute bottom-0 left-20 h-10 w-10 rounded-full bg-white/18 blur-xl sm:left-24 sm:h-12 sm:w-12" />
      <div className="absolute bottom-3 left-28 h-8 w-8 rounded-full bg-white/12 blur-lg sm:left-32 sm:h-10 sm:w-10" />
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
            spin while driving and stop once parked.

            The parked offset is a CSS custom property, not a bare
            340px: this box is only ~300px wide on a phone but can
            run past 900px on desktop, and the car itself jumps from
            160px to 224px wide at the sm: breakpoint. A single fixed
            px offset tuned for desktop pushed the car to (or past)
            the box's LEFT edge on mobile once "100% - 340px" went
            negative.

            No z-index here (unlike the old SVG version) — this is a
            solid photo, not a translucent icon, so sitting above the
            stats made "15+ / Brands" hard to read where they
            overlapped. Left at the default stacking order instead,
            so the stats grid (later in the DOM) paints over it and
            stays legible; the car is still fully visible everywhere
            else. */}
        <div
          className="pointer-events-none absolute top-1/2 h-20 -translate-y-1/2 [--f1-park-offset:175px] sm:h-28 sm:[--f1-park-offset:340px]"
          style={{
            left: driving ? "calc(100% - var(--f1-park-offset))" : "-460px",
            transitionProperty: "left",
            transitionDuration: `${DRIVE_DURATION_MS}ms`,
            transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div className="relative h-full">
            <F1CarPhoto spinning={driving && !revealed} />
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
