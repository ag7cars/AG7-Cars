"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type CollectionCar = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  price: number | null;
  currency: string;
  status: "available" | "booked" | "sold";
  image: string | null;
  color: string | null;
  colorHex: string | null;
  year: number | null;
};

const statusStyles: Record<
  CollectionCar["status"],
  { label: string; dot: string; badge: string }
> = {
  available: {
    label: "Available",
    dot: "bg-emerald-400",
    badge: "border-emerald-400/40 bg-black/70 text-emerald-300",
  },
  booked: {
    label: "Booked",
    dot: "bg-amber-400",
    badge: "border-amber-400/40 bg-black/70 text-amber-300",
  },
  sold: {
    label: "Sold",
    dot: "bg-rose-400",
    badge: "border-rose-400/40 bg-black/70 text-rose-300",
  },
};

function formatPrice(price: number | null, currency: string) {
  if (price === null) return "Price on request";

  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString()}`;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// A car card used in a 4-up grid: 2×2 on mobile, a single row of 4 on
// desktop with the middle two "emphasized" (center-focus styling only
// kicks in at lg: — mobile always sees a plain, equal 2×2 grid). The
// registration year sits as plain text next to the price rather than
// as a second photo-overlay badge — with Status also overlaid on the
// photo, two floating badges collided on cards this narrow.
function CarCard({
  car,
  emphasis,
}: {
  car: CollectionCar;
  emphasis: "focus" | "edge";
}) {
  const status = statusStyles[car.status];

  return (
    <Link
      href={`/cars/${car.slug}`}
      aria-label={`View details for ${car.brand} ${car.name}`}
      className={`block overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] shadow-xl transition-all duration-300 sm:rounded-3xl ${
        emphasis === "focus"
          ? "lg:scale-[1.04] lg:border-white/15 lg:shadow-2xl"
          : "lg:scale-[0.94] lg:opacity-70"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[radial-gradient(120%_140%_at_30%_0%,#1d1d1d_0%,#0c0c0c_60%)]">
        {car.image ? (
          <Image
            src={car.image}
            alt={`${car.brand} ${car.name}`}
            fill
            sizes="(min-width: 1024px) 300px, 46vw"
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">
              No Image
            </span>
          </div>
        )}

        <span
          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border ${status.badge} px-2 py-0.5 text-[9px] font-semibold shadow-lg backdrop-blur-md sm:text-[10px]`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <div className="border-t border-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
        <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40 sm:text-[10px]">
          {car.brand}
        </p>
        <h3 className="line-clamp-1 font-display text-[13px] font-bold text-white sm:text-base">
          {car.name}
        </h3>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-bold text-white sm:text-sm">
            {formatPrice(car.price, car.currency)}
          </span>
          {car.year && (
            <span className="shrink-0 text-[10px] text-white/40">Reg {car.year}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function CollectionCarousel({
  cars,
  sectionClass,
}: {
  cars: CollectionCar[];
  sectionClass: string;
}) {
  const pages = chunk(cars, 4);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (pages.length <= 1 || paused) return;

    const timer = setInterval(() => {
      setPage((current) => (current + 1) % pages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [pages.length, paused]);

  return (
    <section
      id="collection"
      className={`scroll-mt-0 relative overflow-hidden bg-black ${sectionClass}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16">
        <Link href="/cars" className="group block text-center sm:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">
            Discover
          </p>

          <h2 className="mt-4 font-display text-4xl font-semibold text-white underline decoration-white/25 underline-offset-[6px] transition-colors group-hover:text-white/80 group-hover:decoration-white/60 sm:text-5xl">
            AG7 Collection
          </h2>
        </Link>

        {cars.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/5 bg-white/[0.03] px-8 py-16 text-center">
            <p className="text-white/50">No cars have been added to the collection yet. Check back soon.</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
              {pages[page].map((car, i) => (
                <CarCard key={car.id} car={car} emphasis={i === 1 || i === 2 ? "focus" : "edge"} />
              ))}
            </div>

            {pages.length > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPage((current) => (current - 1 + pages.length) % pages.length)}
                  aria-label="Previous"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors duration-300 hover:border-white hover:bg-white hover:text-black"
                >
                  ←
                </button>

                <div className="flex items-center gap-2">
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPage(i)}
                      aria-label={`Go to page ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === page ? "w-6 bg-white" : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((current) => (current + 1) % pages.length)}
                  aria-label="Next"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors duration-300 hover:border-white hover:bg-white hover:text-black"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
