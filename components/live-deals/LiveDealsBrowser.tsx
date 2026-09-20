"use client";

import Image from "next/image";
import Link from "next/link";
import { useTouchReveal } from "@/lib/useTouchReveal";

export type BrowseDeal = {
  id: string;
  brand: string;
  name: string;
  originalPrice: number;
  dealPrice: number;
  currency: string;
  category: string;
  image: string | null;
  color: string | null;
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

// A literal coupon/ticket-stub: sharp corners, a punched-out divider
// between photo and details, and the savings spelled out as an
// actual rupee amount — a different shape and a different focal
// point (money saved, not the brand mark) from the Collection page's
// rounded gauge cards.
function DealCard({ deal }: { deal: BrowseDeal }) {
  const { ref, revealed } = useTouchReveal<HTMLDivElement>();
  const discount = Math.round(
    ((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100
  );
  const savings = deal.originalPrice - deal.dealPrice;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-lg bg-[#0a0a0a] shadow-2xl ring-1 transition-all duration-500 group-hover:ring-red-400/40 ${
        revealed ? "ring-red-400/40" : "ring-white/10"
      }`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {deal.image ? (
          <Image
            src={deal.image}
            alt={`${deal.brand} ${deal.name}${deal.color ? ` in ${deal.color}` : ""} — live deal at AG7 Cars`}
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 46vw"
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${revealed ? "scale-105" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-white/[0.02]">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">No Image</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

        <div className="absolute left-2 top-2 max-w-[45%] rounded-full border border-white/20 bg-black/70 px-2 py-1 backdrop-blur-md sm:left-3 sm:top-3 sm:px-2.5">
          <span className="truncate text-[9px] font-bold uppercase tracking-wider text-white sm:text-[10px]">
            {deal.category}
          </span>
        </div>

        {/* A plain pill instead of a rotated corner banner — the
            banner clipped its own text off-card on narrow phones. */}
        <div className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[9px] font-bold text-white shadow-lg sm:right-3 sm:top-3 sm:px-2.5 sm:text-[10px]">
          {discount}% OFF
        </div>
      </div>

      {/* Punched ticket divider — half-circle notches cut from both
          edges, page background bleeding through, over a dashed
          tear line. */}
      <div className="relative h-0 border-t border-dashed border-white/20">
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-black" />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-black" />
      </div>

      {/* Brand/model live in the solid panel, not over the photo —
          text on a busy photo was hard to read at a glance. */}
      <div className="px-3 pt-3 sm:px-4 sm:pt-4">
        <p className="text-[9px] uppercase tracking-[0.25em] text-white/50 sm:text-[10px]">
          {deal.brand}
        </p>
        <h3 className="line-clamp-2 mt-0.5 font-display text-sm font-bold leading-snug text-white sm:text-lg">
          {deal.name}
        </h3>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <span className="text-[10px] text-white/40 line-through sm:text-xs">
            {formatPrice(deal.originalPrice, deal.currency)}
          </span>
          <span className="inline-block w-fit rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-300 sm:text-[10px]">
            Save {formatPrice(savings, deal.currency)}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-base font-black text-white sm:text-2xl">
            {formatPrice(deal.dealPrice, deal.currency)}
          </span>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs text-white transition-all duration-300 group-hover:border-red-400 group-hover:bg-red-500 sm:h-8 sm:w-8 sm:text-sm ${
              revealed ? "border-red-400 bg-red-500" : "border-white/20"
            }`}
          >
            →
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LiveDealsBrowser({ deals }: { deals: BrowseDeal[] }) {
  if (deals.length === 0) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] px-8 py-20 text-center">
        <p className="text-white/50">No live deals right now. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {deals.map((deal) => (
        <Link key={deal.id} href={`/live-deals/${deal.id}`} className="group relative block h-full">
          <DealCard deal={deal} />
        </Link>
      ))}
    </div>
  );
}
