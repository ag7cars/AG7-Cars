"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StackedDeckCarousel from "./StackedDeckCarousel";

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
  registration: string | null;
  ownership: string | null;
  fuel: string | null;
  kmDriven: number | null;
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

function formatKm(km: number | null) {
  if (km === null) return null;
  if (km === 0) return "Brand New";
  return `${km.toLocaleString("en-IN")} km`;
}

// Only the state + RTO code is shown publicly (e.g. "MP 09"), same as
// the full Collection page — never the raw plate value as typed.
function formatRegistration(value: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^([A-Za-z]{2})\s*-?\s*(\d{1,2})/);
  if (!match) return value.trim();
  const [, state, code] = match;
  return `${state.toUpperCase()} ${code.padStart(2, "0")}`;
}

function CarCardFace({ car, isFront }: { car: CollectionCar; isFront: boolean }) {
  const status = statusStyles[car.status];

  const cardInner = (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/5 bg-white/[0.06] shadow-2xl">
      {car.image ? (
        <Image
          src={car.image}
          alt={`${car.brand} ${car.name}`}
          fill
          sizes="(min-width: 1024px) 384px, (min-width: 640px) 320px, 280px"
          className="object-cover"
          priority={isFront}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-white/[0.02]">
          <span className="text-xs uppercase tracking-[0.3em] text-white/30">
            No Image
          </span>
        </div>
      )}

      {/* Two gradients — a taller one at the top carries the brand,
          name, status and full spec line; a smaller one at the
          bottom carries just the price — so both text blocks stay
          legible over the photo instead of a plain overlay. */}
      <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/85 via-black/35 via-45% to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent" />

      <div className="absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.15em] text-white/60 sm:text-[10px]">
              {car.brand}
            </p>
            <h3 className="line-clamp-1 font-display text-sm font-semibold leading-snug text-white sm:text-base">
              {car.name}
            </h3>
          </div>

          <div
            className={`flex shrink-0 items-center gap-1 rounded-full border ${status.badge} px-2 py-0.5 text-[9px] font-semibold shadow-lg backdrop-blur-md sm:text-[10px]`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-white/70 sm:text-[10.5px]">
          {car.year && <span>Reg: {car.year}</span>}
          {formatRegistration(car.registration) && <span>· {formatRegistration(car.registration)}</span>}
          {car.ownership && <span>· {car.ownership}</span>}
          {car.fuel && <span>· {car.fuel}</span>}
          {formatKm(car.kmDriven) && <span>· {formatKm(car.kmDriven)}</span>}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <p className="text-xs font-medium text-white/90 sm:text-sm">
          {formatPrice(car.price, car.currency)}
        </p>
      </div>
    </div>
  );

  if (!isFront) return cardInner;

  return (
    <Link
      href={`/cars/${car.slug}`}
      aria-label={`View details for ${car.brand} ${car.name}`}
      className="block h-full w-full"
    >
      {cardInner}
    </Link>
  );
}

// Mobile-only: shows 4 cars at a time in a 2x2 grid, swapping to the
// next 4 every 10s — the desktop stacked-deck carousel below sm
// handles one card at a time instead, so this only ever mounts/runs
// under that breakpoint's visibility class.
function CollectionGridMobile({ cars }: { cars: CollectionCar[] }) {
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(cars.length / pageSize));
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (pageCount <= 1) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pageCount), 10000);
    return () => clearInterval(id);
  }, [pageCount]);

  if (cars.length === 0) {
    return (
      <p className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50 sm:hidden">
        No cars have been added to the collection yet. Check back soon.
      </p>
    );
  }

  const visible = cars.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:hidden">
      {visible.map((car) => (
        <CarCardFace key={car.id} car={car} isFront />
      ))}
    </div>
  );
}

export default function CollectionCarousel({
  cars,
  sectionClass,
}: {
  cars: CollectionCar[];
  sectionClass: string;
}) {
  return (
    <section
      id="collection"
      className={`scroll-mt-0 relative overflow-hidden bg-black ${sectionClass}`}
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

        <CollectionGridMobile cars={cars} />

        <div className="hidden sm:block">
          <StackedDeckCarousel
            items={cars}
            getKey={(car) => car.id}
            autoAdvanceMs={4000}
            renderCard={(car, isFront) => <CarCardFace car={car} isFront={isFront} />}
            emptyMessage="No cars have been added to the collection yet. Check back soon."
          />
        </div>
      </div>
    </section>
  );
}