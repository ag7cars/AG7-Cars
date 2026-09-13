"use client";

import { useState } from "react";
import Image from "next/image";

export default function CarImageGallery({
  images,
  alt,
  thumbnails = false,
}: {
  images: string[];
  alt: string;
  /** Adds a row of clickable thumbnails below the main photo instead
      of just dots — for pages with room (and reason) to browse more
      deliberately through every shot. */
  thumbnails?: boolean;
}) {
  const [active, setActive] = useState(0);
  const count = images.length;

  function goTo(index: number) {
    if (count === 0) return;
    setActive(((index % count) + count) % count);
  }

  if (count === 0) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
        <span className="text-xs uppercase tracking-[0.3em] text-white/30">
          No Image
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full lg:max-w-[420px]">
      {/* Main photo — portrait ratio, matching the actual uploaded
          images, so it renders tall instead of being squeezed into
          a landscape box. Navigated with arrow buttons + dots — no
          drag-to-scroll strip, same interaction on any screen size.
          Capped width on large screens — full column width made it
          enormous on wide monitors. */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/5 bg-black">
        {/* All photos stay mounted and stacked, crossfading by
            opacity instead of swapping which one is rendered — a
            keyed swap was unmounting/remounting the Image on every
            click, forcing a fresh fetch+decode each time and showing
            a blank frame until it caught up. This way every photo
            starts loading up front, so switching is instant. */}
        {images.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 640px, 100vw"
            className={`object-cover transition-opacity duration-300 ease-out ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
            priority={index === 0}
          />
        ))}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
            >
              →
            </button>

            {!thumbnails && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
                {images.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Show photo ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === active ? "w-5 bg-white" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {thumbnails && count > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show photo ${index + 1}`}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition sm:h-16 sm:w-16 ${
                index === active ? "border-white" : "border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}