"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CoverflowCarousel from "./CoverflowCarousel";
import { getYouTubeVideoId, isYouTubeUrl, toYouTubeEmbedUrl, toYouTubeThumbnailUrl } from "@/lib/youtube";
import { isInstagramUrl } from "@/lib/instagram";

export type Delivery = {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  /** Photos only — the full gallery for this entry, cover first.
      Null for videos and for legacy single-photo rows predating
      multi-photo entries (those just fall back to [mediaUrl]). */
  imageUrls: string[] | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  colorHex: string | null;
};

function DeliveryCardFace({
  delivery,
  isFront,
  side,
  distance,
  sectionInView,
  onVideoPlayingChange,
}: {
  delivery: Delivery;
  isFront: boolean;
  /** Which way this card is fanned out (1 = right, -1 = left, 0 =
      front). Left-fanned cards mirror their layout — media on the
      right, label on the left — so the brand/model text always sits
      on the card's outer edge instead of getting tucked toward the
      center, whichever side it peeks from. */
  side: -1 | 0 | 1;
  /** How many cards away from front (0 = front itself). Front and its
      immediate neighbor fully preload their video — those are the
      ones about to become front next, so buffering starts before the
      card actually slides into place instead of only once it does. */
  distance: number;
  /** Whether the videos carousel itself is currently scrolled into
      view — sound only plays while the visitor is actually looking
      at this section, and cuts out the instant they scroll past it
      either direction. */
  sectionInView: boolean;
  onVideoPlayingChange: (playing: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // `autoPlay` only governs the very first mount — it doesn't pause
  // a video that's already playing once `isFront` flips to false, so
  // a card sliding to the back kept decoding/playing in the
  // background the whole time, competing with the transform
  // transition for the same thread and making it stutter on weaker
  // mobile hardware. Driving play/pause imperatively off `isFront`
  // stops that decode work the instant a card leaves the front.
  //
  // Mute is set in this same effect, before play() runs, rather than
  // as a static `muted` JSX attribute — toggling `.muted` on an
  // element that's already playing is allowed without a user gesture
  // (the common autoplay-muted-then-unmute pattern), but only if the
  // mute state is correct at the moment `.play()` is actually called.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !(isFront && sectionInView);

    if (isFront) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isFront, sectionInView]);

  const mirrored = side === -1;

  return (
    <div
      className={`flex h-full w-full overflow-hidden rounded-3xl border border-white/5 bg-black shadow-2xl ${
        mirrored ? "flex-row-reverse" : ""
      }`}
    >
      {/* Media — video only; photos use DeliveryPhotoCardFace instead. */}
      <div className="relative h-full flex-1 bg-black">
        {(
          isYouTubeUrl(delivery.mediaUrl) ? (
            (() => {
              const videoId = getYouTubeVideoId(delivery.mediaUrl)!;
              // Only the front card gets a live (autoplaying) iframe —
              // mounting a playing embed for every card in the deck at
              // once (it stays in the DOM for the slide transition)
              // would start them all simultaneously. Back cards show
              // a static thumbnail instead, same idea as the uploaded-
              // video branch below only decoding while it's front.
              return isFront ? (
                <iframe
                  src={`${toYouTubeEmbedUrl(videoId)}?autoplay=1&mute=1&loop=1&playlist=${videoId}&playsinline=1`}
                  title={[delivery.brand, delivery.model].filter(Boolean).join(" ") || "AG7 Cars delivery"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toYouTubeThumbnailUrl(videoId)}
                  alt={`${[delivery.brand, delivery.model].filter(Boolean).join(" ") || "AG7 Cars delivery"}${delivery.color ? ` in ${delivery.color}` : ""} delivered by AG7 Cars`}
                  className="h-full w-full object-cover"
                />
              );
            })()
          ) : isInstagramUrl(delivery.mediaUrl) ? (
            // Instagram's embed widget has a ~326px hard-coded minimum
            // width — wider than this card's media area once the
            // sidebar strip is subtracted, so a live embed here always
            // renders squashed/broken. Show a placeholder instead (same
            // as the grid card) and send the front card through to the
            // detail page, which has enough room for the real embed.
            isFront ? (
              <Link
                href={`/deliveries/${delivery.id}`}
                className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-fuchsia-600/40 to-amber-500/40 transition hover:from-fuchsia-600/55 hover:to-amber-500/55"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md">
                  ▶
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-white/90">
                  View on Instagram
                </span>
              </Link>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-600/40 to-amber-500/40">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/90">
                  Instagram
                </span>
              </div>
            )
          ) : (
            <video
              ref={videoRef}
              src={delivery.mediaUrl}
              muted
              loop
              playsInline
              // Front card and its immediate neighbor fully preload —
              // those are the ones about to become front next, so the
              // buffering delay that used to show up right as a card
              // became active is gone by the time it slides into
              // place. Everything farther out still only fetches
              // metadata; these videos are served straight off the
              // server's own disk with no CDN in front, so preloading
              // the whole deck at once would go back to competing for
              // bandwidth and slowing down the one that's visible.
              preload={distance <= 1 ? "auto" : "metadata"}
              controls={isFront}
              onPlay={() => isFront && onVideoPlayingChange(true)}
              onPause={() => isFront && onVideoPlayingChange(false)}
              onEnded={() => isFront && onVideoPlayingChange(false)}
              className="h-full w-full object-cover"
            />
          )
        )}
      </div>

      {/* Sidebar — vertical Brand + Model text, kept completely
          separate from the media so it never overlaps the video's
          play/pause/seek controls. Sits on the outer edge: right for
          the front/right-fanned cards, left (via flex-row-reverse
          above) for left-fanned ones. */}
      {(delivery.brand || delivery.model) && (
        <div className="flex w-12 shrink-0 flex-col items-center justify-between bg-black py-4 sm:w-14">
          <span />

          <div
            className="flex items-center gap-3 whitespace-nowrap"
            style={{ writingMode: "vertical-rl" }}
          >
            {delivery.brand && (
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/50 sm:text-[11px]">
                {delivery.brand}
              </span>
            )}
            {delivery.model && (
              <span className="font-display text-base font-semibold tracking-wide text-white sm:text-lg">
                {delivery.model}
              </span>
            )}
          </div>

          <span />
        </div>
      )}
    </div>
  );
}

// Photo entries get their own, simpler card — same look and
// click-through-to-detail behavior as Collection/Live Deals (cover
// image, bottom gradient, brand/model text, only the front card
// linked), at Instagram's 4:5 ratio, instead of the video card's
// sidebar-strip layout above.
function DeliveryPhotoCardFace({ delivery, isFront }: { delivery: Delivery; isFront: boolean }) {
  const cover = delivery.imageUrls?.[0] ?? delivery.mediaUrl;
  const label = [delivery.brand, delivery.model].filter(Boolean).join(" ") || "AG7 Cars delivery";
  const photoAlt = `${label}${delivery.color ? ` in ${delivery.color}` : ""} delivered by AG7 Cars`;

  const cardInner = (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/5 bg-white/[0.06] shadow-2xl">
      <Image
        src={cover}
        alt={photoAlt}
        fill
        sizes="(min-width: 1024px) 384px, (min-width: 640px) 320px, 280px"
        className="object-cover"
        priority={isFront}
      />

      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/40 via-40% to-transparent" />

      {(delivery.brand || delivery.model) && (
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          {delivery.brand && (
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/50">{delivery.brand}</p>
          )}
          {delivery.model && (
            <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-white sm:text-base">
              {delivery.model}
            </h3>
          )}
        </div>
      )}
    </div>
  );

  if (!isFront) return cardInner;

  return (
    <Link href={`/deliveries/${delivery.id}`} aria-label={`View details for ${label}`} className="block h-full w-full">
      {cardInner}
    </Link>
  );
}

export default function DeliveriesGallery({
  videos,
  photos,
  sectionClass,
}: {
  videos: Delivery[];
  photos: Delivery[];
  sectionClass: string;
}) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videosInView, setVideosInView] = useState(false);
  const videosSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = videosSectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVideosInView(entry.isIntersecting),
      { threshold: 0.5 }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="deliveries"
      className={`scroll-mt-0 relative overflow-hidden bg-black ${sectionClass}`}
    >
      <div className="relative mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16">

        <Link href="/deliveries" className="group block text-center sm:text-left">
          <h2 className="font-display text-4xl font-semibold text-white underline decoration-white/25 underline-offset-[6px] transition-colors group-hover:text-white/80 group-hover:decoration-white/60 sm:text-5xl">
            AG7 Deliveries
          </h2>
        </Link>

        {/* Videos first, photos below — no "Videos"/"Photos"
            sub-headings, just the two carousels stacked in order. */}
        <div ref={videosSectionRef} className="mt-8">
          <CoverflowCarousel
            items={videos}
            getKey={(delivery) => delivery.id}
            autoAdvanceMs={5000}
            paused={videoPlaying}
            range={videos.length}
            renderCard={(delivery, isFront, side, distance) => (
              <DeliveryCardFace
                delivery={delivery}
                isFront={isFront}
                side={side}
                distance={distance}
                sectionInView={videosInView}
                onVideoPlayingChange={setVideoPlaying}
              />
            )}
            emptyMessage="No delivery videos have been posted yet. Check back soon."
          />
        </div>

        <div className="mt-16 sm:mt-20">
          <CoverflowCarousel
            items={photos}
            getKey={(delivery) => delivery.id}
            autoAdvanceMs={5000}
            aspectClass="aspect-[4/5]"
            renderCard={(delivery, isFront) => <DeliveryPhotoCardFace delivery={delivery} isFront={isFront} />}
            emptyMessage="No delivery photos have been posted yet. Check back soon."
          />
        </div>
      </div>
    </section>
  );
}
