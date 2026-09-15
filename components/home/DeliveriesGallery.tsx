"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StackedDeckCarousel from "./StackedDeckCarousel";
import { getYouTubeVideoId, isYouTubeUrl, toYouTubeEmbedUrl, toYouTubeThumbnailUrl } from "@/lib/youtube";
import { isInstagramUrl } from "@/lib/instagram";
import InstagramEmbed from "@/components/InstagramEmbed";

export type Delivery = {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  brand: string | null;
  model: string | null;
  color: string | null;
  colorHex: string | null;
};

function DeliveryCardFace({
  delivery,
  isFront,
  side,
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
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isFront) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isFront]);

  const mirrored = side === -1;

  return (
    <div
      className={`flex h-full w-full overflow-hidden rounded-3xl border border-white/5 bg-black shadow-2xl ${
        mirrored ? "flex-row-reverse" : ""
      }`}
    >
      {/* Media */}
      <div className="relative h-full flex-1 bg-black">
        {delivery.mediaType === "video" ? (
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
                  alt={[delivery.brand, delivery.model].filter(Boolean).join(" ") || "AG7 Cars delivery"}
                  className="h-full w-full object-cover"
                />
              );
            })()
          ) : isInstagramUrl(delivery.mediaUrl) ? (
            // Instagram's widget doesn't autoplay regardless of which
            // card is front (unlike YouTube), so there's no front/back
            // distinction needed here — it just always shows as
            // Instagram's own paused post card.
            <InstagramEmbed url={delivery.mediaUrl} />
          ) : (
            <video
              ref={videoRef}
              src={delivery.mediaUrl}
              muted
              loop
              playsInline
              preload="auto"
              controls={isFront}
              onPlay={() => isFront && onVideoPlayingChange(true)}
              onPause={() => isFront && onVideoPlayingChange(false)}
              onEnded={() => isFront && onVideoPlayingChange(false)}
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <Image
            src={delivery.mediaUrl}
            alt={[delivery.brand, delivery.model].filter(Boolean).join(" ") || "AG7 Cars delivery"}
            fill
            sizes="(min-width: 1024px) 384px, (min-width: 640px) 320px, 280px"
            className="object-cover"
          />
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

function noop() {}

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
        <div className="mt-8">
          <StackedDeckCarousel
            items={videos}
            getKey={(delivery) => delivery.id}
            autoAdvanceMs={5000}
            paused={videoPlaying}
            renderCard={(delivery, isFront, side) => (
              <DeliveryCardFace
                delivery={delivery}
                isFront={isFront}
                side={side}
                onVideoPlayingChange={setVideoPlaying}
              />
            )}
            emptyMessage="No delivery videos have been posted yet. Check back soon."
          />
        </div>

        <div className="mt-16 sm:mt-20">
          <StackedDeckCarousel
            items={photos}
            getKey={(delivery) => delivery.id}
            autoAdvanceMs={5000}
            renderCard={(delivery, isFront, side) => (
              <DeliveryCardFace
                delivery={delivery}
                isFront={isFront}
                side={side}
                onVideoPlayingChange={noop}
              />
            )}
            emptyMessage="No delivery photos have been posted yet. Check back soon."
          />
        </div>
      </div>
    </section>
  );
}
