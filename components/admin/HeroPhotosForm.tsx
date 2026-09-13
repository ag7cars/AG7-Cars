"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type Slot = "desktop" | "mobile";

const allowedTypes = "image/jpeg,image/png,image/webp";

const SLOT_LABELS: Record<Slot, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
};

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

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setSaving(true);

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("position", String(position));
      formData.append("media", file);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPreview(imageUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
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
          ? "Shown as the rotating background on the desktop hero section."
          : "Shown as the rotating background on the mobile/tablet hero section."}
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
