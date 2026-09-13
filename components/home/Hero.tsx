"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/* ============================================================
   BACKGROUND IMAGE SETS
   Desktop and mobile photos are editable from the admin panel
   (Admin Dashboard → Hero Photos) and passed in as props — these
   are just the fallback shown if that table has no rows yet.
   ============================================================ */
const FALLBACK_DESKTOP_IMAGES = [
  "/images/Home (1).jpg",
  "/images/Home (3).jpg",
  "/images/Home (4).jpg",
  "/images/Home (5).jpg",
];

const FALLBACK_MOBILE_IMAGES = [
  "/images/home-mobile 1.jpg",
  "/images/home-mobile 2.jpg",
  "/images/home-mobile 3.jpg",
  "/images/home-mobile 4.jpg",
];

const ROTATE_INTERVAL_MS = 3000;

function useAutoRotate(length: number, intervalMs: number) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (length <= 1) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [length, intervalMs]);

  return index;
}

function RotatingBackground({
  images,
  alt,
  objectPosition,
}: {
  images: string[];
  alt: string;
  objectPosition: string;
}) {
  const activeIndex = useAutoRotate(images.length, ROTATE_INTERVAL_MS);

  return (
    <>
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          priority={index === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
          style={{ objectPosition }}
        />
      ))}
    </>
  );
}

export default function Hero({
  desktopImages,
  mobileImages,
}: {
  desktopImages?: string[];
  mobileImages?: string[];
}) {
  const resolvedDesktopImages =
    desktopImages && desktopImages.length > 0 ? desktopImages : FALLBACK_DESKTOP_IMAGES;
  const resolvedMobileImages =
    mobileImages && mobileImages.length > 0 ? mobileImages : FALLBACK_MOBILE_IMAGES;

  return (
    <section className="relative min-h-screen overflow-hidden bg-black">
      {/* =========================================================
          DESKTOP HERO — the photo starts right below the (now
          solid black) navbar instead of running full-bleed behind
          it, matching the navbar's own height (h-24 at lg).
          ========================================================= */}
      <div className="absolute inset-x-0 bottom-0 top-24 hidden lg:block">
        <RotatingBackground
          images={resolvedDesktopImages}
          alt="AG7 Cars collection"
          objectPosition="center 55%"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/65 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="relative z-10 hidden min-h-screen lg:flex">
        <div className="mx-auto flex w-full max-w-[1440px] items-center px-5 pt-16 sm:px-8 lg:px-12 xl:px-16">
          <div className="max-w-[620px]">
            <p className="mb-6 text-sm font-medium uppercase tracking-[0.3em] text-white/70">
              Exclusive Deals on Brand New & Pre-Owned Supercars and Premium Luxury Cars
            </p>
            <h1 className="font-display text-6xl font-semibold leading-[0.94] tracking-[-0.045em] text-white xl:text-7xl 2xl:text-[5.5rem]">
              Built on Passion,
              <br />
              <span className="text-white/80">Driven by Trust.</span>
            </h1>
            <p className="mt-7 max-w-[570px] text-base leading-8 text-white/75 xl:text-lg">
              Discover an exclusive collection of remarkable new and exceptional pre-owned supercars
              and luxury automobiles, curated for those who expect nothing but the extraordinary.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cars"
                className="inline-flex h-13 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold tracking-wide text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90"
              >
                Explore AG7 Collection
              </Link>
              <Link
                href="#contact"
                className="inline-flex h-13 items-center justify-center rounded-full border border-white/40 bg-white/5 px-7 text-sm font-semibold tracking-wide text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
              >
                Enquire Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          MOBILE / TABLET HERO

          The background image sits behind two text blocks (top
          and bottom), with the car meant to stay visible in the
          clear band between them. Two things used to break that:
            1. The gradient was a LEFT-TO-RIGHT dark fade (copied
               from the desktop layout, where text sits on the
               left). On a centered mobile layout that just
               darkens one side of the photo for no reason and
               does nothing to separate text from the car.
            2. The spacer between the two text blocks could
               shrink to near 0 on short screens, pushing both
               text blocks together right on top of the car.

          Fix: a TOP-and-BOTTOM gradient only (car band in the
          middle stays clear), and a spacer with a real minimum
          height so the two text blocks can never collapse onto
          the middle of the photo.
          ========================================================= */}

      <div className="relative min-h-[100dvh] lg:hidden">
        {/* Matches the navbar's own height at each breakpoint
            (h-16 / sm:h-20) so the photo starts right below it. */}
        <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden sm:top-20">
          <RotatingBackground
            images={resolvedMobileImages}
            alt="AG7 Cars collection"
            objectPosition="center 62%"
          />

          {/* Dark band at the top (behind heading) and bottom
              (behind description/buttons) — the middle strip is
              left clear so the car stays visible. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/85" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        </div>

        <div
          className="
            relative z-10 flex min-h-[100dvh] w-full max-w-[1440px] mx-auto
            flex-col
            px-5 sm:px-8
          "
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + clamp(4rem, 12vh, 6.5rem))",
            paddingBottom: "calc(env(safe-area-inset-bottom) + clamp(2.5rem, 8vh, 4rem))",
          }}
        >
          {/* TOP CONTENT — plain text over the photo's own gradient,
              no boxed/blurred panel. text-shadow carries the
              contrast instead. Sized down from the first pass at
              this — the desktop copy is noticeably longer than the
              old mobile-only copy it replaced, so the old large
              clamp values were wrapping awkwardly and reading as
              too big for a phone screen. */}
          <div className="flex justify-center text-center">
            <div className="w-full max-w-[600px]">
              <p
                className="mb-2.5 font-medium uppercase text-white/75"
                style={{
                  fontSize: "clamp(0.5625rem, 1.8vh, 0.75rem)",
                  letterSpacing: "0.18em",
                  textShadow: "0 2px 10px rgba(0,0,0,0.9)",
                }}
              >
                Exclusive Deals on Brand New &amp; Pre-Owned Supercars and Premium Luxury Cars
              </p>

              <h1
                className="font-display font-semibold text-white"
                style={{
                  fontSize: "clamp(1.375rem, 5vh, 2.25rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  textShadow: "0 2px 14px rgba(0,0,0,0.9)",
                }}
              >
                Built on Passion,
                <br />
                <span className="text-white/85">Driven by Trust.</span>
              </h1>
            </div>
          </div>

          {/* Flexible spacer — this is where the car shows through.
              Guaranteed minimum height so the two text blocks can
              never converge on top of it, even on short screens. */}
          <div className="flex-1 min-h-[3.5rem]" />

          {/* BOTTOM CONTENT — same plain-text-over-gradient
              treatment as the top block. */}
          <div className="flex justify-center text-center">
            <div className="w-full max-w-[480px]">
              <p
                className="mx-auto max-w-[480px] text-white/80"
                style={{
                  fontSize: "clamp(0.6875rem, 1.9vh, 0.875rem)",
                  lineHeight: 1.5,
                  textShadow: "0 2px 10px rgba(0,0,0,0.9)",
                }}
              >
                Discover an exclusive collection of remarkable
                new and exceptional pre-owned supercars and
                luxury automobiles, curated for those who expect
                nothing but the extraordinary.
              </p>

              {/* flex-nowrap + tighter padding/gap than the desktop
                  version — at px-6/gap-3 these two buttons combined
                  were just wide enough to wrap onto their own lines
                  on narrow phones (320-375px). */}
              <div
                className="flex flex-nowrap justify-center gap-2"
                style={{ marginTop: "clamp(1rem, 3vh, 1.75rem)" }}
              >
                <Link
                  href="/cars"
                  className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-white px-3.5 text-xs font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90 sm:h-12 sm:px-6 sm:text-sm"
                >
                  Explore AG7 Collection
                </Link>
                <Link
                  href="#contact"
                  className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/40 bg-black/20 px-3.5 text-xs font-semibold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white/10 sm:h-12 sm:px-6 sm:text-sm"
                >
                  Enquire Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}