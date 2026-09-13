"use client";

import Image from "next/image";
import Link from "next/link";

export type BrowseDelivery = {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  brand: string | null;
  model: string | null;
};

// A pinned Polaroid snapshot instead of a listing card — cream
// paper, a thick caption strip, a slight scattered tilt. The tilt is
// the resting look on every device, including touch — it only
// straightens on a real mouse hover, since auto-straightening it on
// scroll-into-view (like the other cards' reveal effect) would undo
// the pinned-photo look the moment it appeared on mobile.
function DeliveryCard({ delivery, index }: { delivery: BrowseDelivery; index: number }) {
  const tilt = index % 3 === 0 ? "-rotate-2" : index % 3 === 1 ? "rotate-2" : "-rotate-1";

  return (
    <div
      className={`relative rounded-sm bg-[#f4efe4] p-2.5 pb-9 shadow-xl ring-1 ring-black/5 transition-all duration-500 ease-out sm:p-3 sm:pb-11 ${tilt} group-hover:rotate-0 group-hover:-translate-y-1.5 group-hover:shadow-2xl`}
    >
      {/* Pushpin */}
      <span className="absolute left-1/2 top-0 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-md ring-2 ring-red-300/50" />

      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
        {delivery.mediaType === "video" ? (
          <>
            <video
              src={delivery.mediaUrl}
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md">
                ▶
              </span>
            </div>
          </>
        ) : (
          <Image
            src={delivery.mediaUrl}
            alt={[delivery.brand, delivery.model].filter(Boolean).join(" ") || "AG7 Cars delivery"}
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 46vw"
            className="object-cover"
          />
        )}
      </div>

      <div className="px-1 pt-3 text-center sm:pt-4">
        {delivery.brand && (
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/60 sm:text-[10px]">
            {delivery.brand}
          </p>
        )}
        <h3 className="line-clamp-2 mt-0.5 font-display text-sm font-bold leading-snug text-black/85 sm:text-lg">
          {delivery.model || "AG7 Cars delivery"}
        </h3>
      </div>
    </div>
  );
}

function DeliveryGrid({ deliveries }: { deliveries: BrowseDelivery[] }) {
  return (
    <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4">
      {deliveries.map((delivery, index) => (
        <Link key={delivery.id} href={`/deliveries/${delivery.id}`} className="group relative block h-full">
          <DeliveryCard delivery={delivery} index={index} />
        </Link>
      ))}
    </div>
  );
}

export default function DeliveriesBrowser({
  deliveries,
}: {
  deliveries: BrowseDelivery[];
}) {
  if (deliveries.length === 0) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] px-8 py-20 text-center">
        <p className="text-white/50">No deliveries posted yet. Check back soon.</p>
      </div>
    );
  }

  const videos = deliveries.filter((delivery) => delivery.mediaType === "video");
  const photos = deliveries.filter((delivery) => delivery.mediaType === "image");

  return (
    <div className="space-y-14">
      {videos.length > 0 && (
        <div>
          <h2 className="text-center font-display text-2xl font-semibold text-white sm:text-left sm:text-3xl">
            Videos
          </h2>
          <div className="mt-6">
            <DeliveryGrid deliveries={videos} />
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <h2 className="text-center font-display text-2xl font-semibold text-white sm:text-left sm:text-3xl">
            Photos
          </h2>
          <div className="mt-6">
            <DeliveryGrid deliveries={photos} />
          </div>
        </div>
      )}
    </div>
  );
}
