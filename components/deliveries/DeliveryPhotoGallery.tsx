"use client";

import { useState } from "react";
import Image from "next/image";

// Same crossfade-by-opacity interaction as CarImageGallery (see that
// component for why: keyed swapping was unmounting/remounting the
// Image on every click, forcing a fresh fetch+decode each time), but
// without its own bordered/rounded outer box — this one just fills
// whatever slot it's dropped into, since here that's already the
// Polaroid frame's own photo area.
export default function DeliveryPhotoGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const count = images.length;

  function goTo(index: number) {
    if (count === 0) return;
    setActive(((index % count) + count) % count);
  }

  return (
    <>
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 448px, 100vw"
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
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
          >
            →
          </button>

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
        </>
      )}
    </>
  );
}
