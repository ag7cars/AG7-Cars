"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CoverflowCarousel from "./CoverflowCarousel";

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
  manufacturingYear: number | null;
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
  return `${km.toLocaleString("en-IN")} Kms`;
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

// e.g. "2022 Lamborghini Huracán EVO in Nero Noctis at AG7 Cars
// showroom, Indore" — falls back gracefully as fields go missing.
function carAltText(car: Pick<CollectionCar, "brand" | "name" | "manufacturingYear" | "color">) {
  const year = car.manufacturingYear ? `${car.manufacturingYear} ` : "";
  const colorSuffix = car.color ? ` in ${car.color}` : "";
  return `${year}${car.brand} ${car.name}${colorSuffix} at AG7 Cars showroom, Indore`;
}

function CarCardFace({ car, isFront }: { car: CollectionCar; isFront: boolean }) {
  const status = statusStyles[car.status];

  const cardInner = (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/5 bg-white/[0.06] shadow-2xl">
      {car.image ? (
        <Image
          src={car.image}
          alt={carAltText(car)}
          fill
          sizes="(min-width: 1024px) 384px, (min-width: 640px) 320px, 280px"
          className="object-cover"
          priority={isFront}
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-white/[0.02]">
          <span className="text-xs uppercase tracking-[0.3em] text-white/30">
            No Image
          </span>
        </div>
      )}

      {/* Two gradients — a taller, darker one at the top carries the
          brand, name, status and spec grid; a smaller one at the
          bottom carries just the price — dark enough on their own
          that the text reads clearly no matter what's in the photo
          behind it. */}
      <div className="absolute inset-x-0 top-0 h-3/4 bg-gradient-to-b from-black/95 via-black/70 via-55% to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/95 to-transparent" />

      <div className="absolute inset-x-0 top-0 p-3 sm:p-4">
        {/* Brand + status share the first row again — both sized down
            just enough that a long brand like "Mercedes-Benz" still
            fits next to the badge without truncating or pushing the
            name row down further. */}
        <div className="flex items-center justify-between gap-1.5">
          <p className="min-w-0 truncate text-[8px] uppercase tracking-[0.08em] text-white/60 sm:text-[10px] sm:tracking-[0.15em]">
            {car.brand}
          </p>

          <div
            className={`flex shrink-0 items-center gap-0.5 rounded-full border ${status.badge} px-1 py-0.5 text-[7px] font-semibold shadow-lg backdrop-blur-md sm:gap-1 sm:px-1.5 sm:text-[9px]`}
          >
            <span className={`h-1 w-1 shrink-0 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>

        <h3 className="font-display text-xs font-semibold leading-snug text-white sm:text-sm">
          {car.name}
        </h3>

        {/* Fixed 6-slot grid — same position for every field on every
            card, regardless of missing data (shown as "—"), so cards
            line up with each other instead of each wrapping to a
            different width/line count. */}
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-white/75 sm:text-[10.5px]">
          <span>Mfg: {car.manufacturingYear ?? "—"}</span>
          <span className="text-right">Reg: {car.year ?? "—"}</span>
          <span>{car.ownership ?? "—"}</span>
          <span className="text-right">{formatRegistration(car.registration) ?? "—"}</span>
          <span>{formatKm(car.kmDriven) ?? "—"}</span>
          <span className="text-right">{car.fuel ?? "—"}</span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <p className="text-xs font-semibold text-white sm:text-sm">
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
// next 4 every 10s (or on demand via swipe left/right) — the desktop
// coverflow carousel below sm handles one card at a time instead, so
// this only ever mounts/runs under that breakpoint's visibility class.
function CollectionGridMobile({ cars }: { cars: CollectionCar[] }) {
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(cars.length / pageSize));
  const [page, setPage] = useState(0);
  const startX = useRef<number | null>(null);
  // A swipe that ends over a card would otherwise still fire that
  // card's Link click right after pointerup — this flag tells the
  // capturing click handler below to swallow just that one click.
  const suppressClick = useRef(false);

  useEffect(() => {
    if (pageCount <= 1) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pageCount), 10000);
    return () => clearInterval(id);
  }, [pageCount]);

  function goToPage(next: number) {
    setPage(((next % pageCount) + pageCount) % pageCount);
  }

  function handlePointerDown(event: React.PointerEvent) {
    startX.current = event.clientX;
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(delta) < 40) return;
    suppressClick.current = true;
    goToPage(delta < 0 ? page + 1 : page - 1);
  }

  function handleClickCapture(event: React.MouseEvent) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  if (cars.length === 0) {
    return (
      <p className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50 sm:hidden">
        No cars have been added to the collection yet. Check back soon.
      </p>
    );
  }

  const visible = cars.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div
      className="mt-10 touch-pan-y select-none sm:hidden"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      <div className="grid grid-cols-2 gap-3">
        {visible.map((car) => (
          <CarCardFace key={car.id} car={car} isFront />
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-5 flex items-end justify-center gap-2">
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToPage(index)}
              aria-label={`Go to page ${index + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === page ? "w-6 -translate-y-1 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
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
          <CoverflowCarousel
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