"use client";

import Image from "next/image";
import Link from "next/link";
import CoverflowCarousel from "./CoverflowCarousel";

export type LiveDeal = {
  id: string;
  brand: string;
  name: string;
  originalPrice: number;
  dealPrice: number;
  currency: string;
  category: string;
  image: string | null;
  color: string | null;
  colorHex: string | null;
};

function formatPrice(price: number, currency: string) {
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

function DealCardContent({ deal, isFront }: { deal: LiveDeal; isFront: boolean }) {
  const savings = deal.originalPrice - deal.dealPrice;

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-3xl border transition-colors duration-500 ${
        isFront ? "border-white/15 bg-white/[0.06]" : "border-white/5 bg-white/[0.03]"
      }`}
    >
      {deal.image ? (
        <Image
          src={deal.image}
          alt={`${deal.brand} ${deal.name}${deal.color ? ` in ${deal.color}` : ""} — live deal at AG7 Cars`}
          fill
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 260px, 180px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-white/[0.02]">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">
            No Image
          </span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

      <div className="absolute left-2 top-2 max-w-[40%] rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white backdrop-blur-md sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
        {deal.category}
      </div>

      <div className="absolute right-2 top-2 max-w-[55%] rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
        Save {formatPrice(savings, deal.currency)}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-4 lg:p-5">
        <p className="truncate text-[9px] uppercase tracking-[0.15em] text-white/50 sm:text-[11px] sm:tracking-[0.2em]">
          {deal.brand}
        </p>
        <h3 className="mt-0.5 truncate font-display text-sm font-semibold text-white sm:mt-1 sm:text-lg lg:text-xl">
          {deal.name}
        </h3>
        <div className="mt-0.5 flex items-baseline gap-1.5 sm:mt-1 sm:gap-2">
          <span className="truncate text-[10px] text-white/40 line-through sm:text-xs">
            {formatPrice(deal.originalPrice, deal.currency)}
          </span>
          <span className="truncate text-xs font-semibold text-emerald-300 sm:text-sm">
            {formatPrice(deal.dealPrice, deal.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LiveDealsStrip({
  deals,
  sectionClass,
}: {
  deals: LiveDeal[];
  sectionClass: string;
}) {
  if (deals.length === 0) {
    return null;
  }

  return (
    <section
      id="live-deals"
      className={`scroll-mt-0 relative overflow-hidden border-y border-white/5 bg-gradient-to-b from-red-500/[0.06] via-black to-black ${sectionClass}`}
    >
      <div className="relative mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16">
        <Link href="/live-deals" className="group block text-center sm:text-left">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-red-300">
              Live Deals
            </p>
          </div>

          <h2 className="mt-4 font-display text-3xl font-semibold text-white underline decoration-white/25 underline-offset-[6px] transition-colors group-hover:text-white/80 group-hover:decoration-white/60 sm:text-4xl">
            Limited-Period Offers
          </h2>
        </Link>

        <CoverflowCarousel
          items={deals}
          getKey={(deal) => deal.id}
          autoAdvanceMs={4000}
          range={deals.length}
          renderCard={(deal, isFront) => (
            // Always a Link, front or not — the carousel's own click
            // handler on the outer card brings a background card to
            // the front, so navigation only needs to be blocked
            // here, not swapped out for a different element type
            // (that swap was what caused the image to remount and
            // flash blank on every transition).
            <Link
              href={`/live-deals/${deal.id}`}
              aria-label={`View details for ${deal.brand} ${deal.name}`}
              className="block h-full w-full"
              tabIndex={isFront ? 0 : -1}
              onClick={(event) => {
                if (!isFront) event.preventDefault();
              }}
            >
              <DealCardContent deal={deal} isFront={isFront} />
            </Link>
          )}
        />
      </div>
    </section>
  );
}
