"use client";

import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImageFile } from "@/lib/cropImage";

type Slot = "desktop" | "mobile";

const allowedTypes = "image/jpeg";

const SLOT_LABELS: Record<Slot, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
};

// Desktop hero photos crop to 16:9 (widescreen background); mobile
// ones crop to 9:16 (portrait, matching a phone screen) — so every
// photo in a slot always comes out the same shape as the others.
const SLOT_ASPECT: Record<Slot, number> = {
  desktop: 16 / 9,
  mobile: 9 / 16,
};

function CropModal({
  imageSrc,
  aspect,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  aspect: number;
  onCancel: () => void;
  onConfirm: (pixelCrop: Area) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5">
        <p className="text-sm font-semibold text-white">
          Crop photo ({aspect > 1 ? "16:9" : "9:16"})
        </p>
        <p className="mt-1 text-xs text-white/50">
          Drag to reposition, scroll or pinch to zoom.
        </p>

        <div className="relative mt-4 h-[55vh] w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!croppedAreaPixels}
            onClick={() => croppedAreaPixels && onConfirm(croppedAreaPixels)}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Crop & Upload
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoSlot({
  slot,
  position,
  imageUrl,
  onReplaced,
}: {
  slot: Slot;
  position: number;
  imageUrl: string;
  onReplaced: (slot: Slot, position: number, newUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(imageUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setCropSrc(URL.createObjectURL(file));
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleCropConfirm(pixelCrop: Area) {
    if (!cropSrc) return;

    setSaving(true);
    setError("");

    try {
      const croppedFile = await getCroppedImageFile(
        cropSrc,
        pixelCrop,
        `${slot}-${position}.jpg`
      );

      const localPreview = URL.createObjectURL(croppedFile);
      setPreview(localPreview);

      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("position", String(position));
      formData.append("media", croppedFile);

      const response = await fetch("/api/admin/hero", {
        method: "PUT",
        body: formData,
      });

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(result.error || `Something went wrong (status ${response.status}).`);
      }

      setPreview(result.imageUrl);
      onReplaced(slot, position, result.imageUrl);
      URL.revokeObjectURL(localPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPreview(imageUrl);
    } finally {
      closeCrop();
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="relative aspect-video w-full bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt={`${SLOT_LABELS[slot]} hero photo ${position}`} className="h-full w-full object-cover" />

        {saving && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
            Uploading…
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <p className="text-sm text-white/60">Photo {position}</p>

        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes}
          onChange={handleFile}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
          className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:border-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Change Photo
        </button>
      </div>

      {error && <p className="px-4 pb-3 text-xs text-red-400">{error}</p>}

      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          aspect={SLOT_ASPECT[slot]}
          onCancel={closeCrop}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}

export default function HeroPhotosForm({
  initialImages,
}: {
  initialImages: Record<Slot, string[]>;
}) {
  const [activeTab, setActiveTab] = useState<Slot>("desktop");
  const [images, setImages] = useState(initialImages);

  function handleReplaced(slot: Slot, position: number, newUrl: string) {
    setImages((current) => {
      const next = { ...current, [slot]: [...current[slot]] };
      next[slot][position - 1] = newUrl;
      return next;
    });
  }

  return (
    <div>
      <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
        {(["desktop", "mobile"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeTab === tab
                ? "bg-white text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {SLOT_LABELS[tab]}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-white/50">
        {activeTab === "desktop"
          ? "Shown as the rotating background on the desktop hero section. Photos crop to 16:9."
          : "Shown as the rotating background on the mobile/tablet hero section. Photos crop to 9:16."}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {images[activeTab].map((imageUrl, index) => (
          <PhotoSlot
            key={`${activeTab}-${index + 1}`}
            slot={activeTab}
            position={index + 1}
            imageUrl={imageUrl}
            onReplaced={handleReplaced}
          />
        ))}
      </div>
    </div>
  );
}
