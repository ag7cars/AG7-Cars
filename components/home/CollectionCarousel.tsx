"use client";

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

      {/* Kept to just the bottom strip now that the text block is a
          single compact row — the old full-height gradient darkened
          more of the photo than the (now smaller) text actually
          needs. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/40 via-40% to-transparent" />

      <div
        className={`absolute left-3 top-3 flex items-center gap-1 rounded-full border ${status.badge} px-2 py-0.5 text-[10px] font-semibold shadow-lg backdrop-blur-md`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
        {status.label}
      </div>

      {car.year && (
        <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white/80 shadow-lg backdrop-blur-md">
          Reg: {car.year}
        </div>
      )}

      {/* Text only (no logo) — brand, name, and price all sized down
          a step from the first pass so this block covers less of
          the photo. */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/50">
          {car.brand}
        </p>
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-white sm:text-base">
          {car.name}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-white/80">
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

        <StackedDeckCarousel
          items={cars}
          getKey={(car) => car.id}
          autoAdvanceMs={4000}
          renderCard={(car, isFront) => <CarCardFace car={car} isFront={isFront} />}
          emptyMessage="No cars have been added to the collection yet. Check back soon."
        />
      </div>
    </section>
  );
}