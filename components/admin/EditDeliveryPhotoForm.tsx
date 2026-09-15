"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import DeleteButton from "@/components/admin/DeleteButton";

const deliverySchema = z.object({
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  caption: z.string().trim().max(500, "Keep the caption under 500 characters").optional(),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;

export type EditableDeliveryPhotos = DeliveryFormValues & {
  id: string;
  imageUrls: string[];
};

export default function EditDeliveryPhotoForm({ delivery }: { delivery: EditableDeliveryPhotos }) {
  const router = useRouter();
  const [existingImages, setExistingImages] = useState<string[]>(delivery.imageUrls);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      brand: delivery.brand,
      model: delivery.model,
      caption: delivery.caption,
    },
  });

  const totalImageCount = existingImages.length + newImages.length;

  function addImages(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selected.length === 0) return;

    setNewImages((current) => {
      const combined = [...current, ...selected];
      const allowed = combined.slice(0, Math.max(0, 10 - existingImages.length));

      if (combined.length > allowed.length) {
        setMessage("You can have a maximum of 10 photos total.");
      } else {
        setMessage("");
      }

      setNewPreviews((prevUrls) => {
        prevUrls.forEach((url) => URL.revokeObjectURL(url));
        return allowed.map((file) => URL.createObjectURL(file));
      });

      return allowed;
    });
  }

  function removeExistingImage(index: number) {
    setExistingImages((current) => current.filter((_, i) => i !== index));
  }

  function moveExistingImage(index: number, direction: -1 | 1) {
    setExistingImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeNewImage(index: number) {
    setNewImages((current) => current.filter((_, i) => i !== index));
    setNewPreviews((current) => {
      URL.revokeObjectURL(current[index]);
      return current.filter((_, i) => i !== index);
    });
  }

  const onSubmit: SubmitHandler<DeliveryFormValues> = async (values) => {
    if (totalImageCount === 0) {
      setMessage("Please keep at least one photo.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("delivery", JSON.stringify(values));
      formData.append("existingImages", JSON.stringify(existingImages));
      newImages.forEach((image) => formData.append("images", image));

      const response = await fetch(`/api/admin/deliveries/${delivery.id}`, {
        method: "PATCH",
        body: formData,
      });

      const text = await response.text();
      let result: { error?: string } = {};
      if (text) {
        try {
          result = JSON.parse(text) as { error?: string };
        } catch {
          throw new Error(`Update failed (${response.status} ${response.statusText}).`);
        }
      }

      if (!response.ok) {
        throw new Error(result.error || "Unable to save changes.");
      }

      router.push("/admin/dashboard/deliveries");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* =====================================================
          PHOTOS
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Delivery Photos</h2>
        <p className="mt-2 text-sm text-white/50">
          The first photo is the cover shown on the landing page and grid. Remove or reorder
          existing photos, and add new ones — up to 10 total.
        </p>

        {existingImages.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-xs uppercase tracking-wide text-white/40">Current photos</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {existingImages.map((url, index) => (
                <div
                  key={url}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-black"
                >
                  <div className="relative aspect-[4/5] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Delivery photo ${index + 1}`} className="h-full w-full object-cover" />

                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-black">
                        Cover
                      </span>
                    )}

                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[11px] font-semibold text-white">
                      {index + 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 border-t border-white/10 bg-black/40 p-1.5">
                    <button
                      type="button"
                      onClick={() => moveExistingImage(index, -1)}
                      disabled={index === 0}
                      aria-label="Move image earlier"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      aria-label="Remove image"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-red-500/20 hover:text-red-300"
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExistingImage(index, 1)}
                      disabled={index === existingImages.length - 1}
                      aria-label="Move image later"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="mt-6 flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:bg-white/[0.06]">
          {newImages.length === 0 ? "Add New Photos" : `Add More (${totalImageCount}/10)`}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={addImages}
            disabled={totalImageCount >= 10}
            className="hidden"
          />
        </label>

        {newImages.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-xs uppercase tracking-wide text-white/40">New photos to add</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {newImages.map((image, index) => (
                <div
                  key={`${image.name}-${image.lastModified}-${index}`}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-black"
                >
                  <div className="relative aspect-[4/5] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newPreviews[index]}
                      alt={`New photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    aria-label="Remove image"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white/80 transition hover:bg-red-500/70 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          BRAND & MODEL
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Brand &amp; Model</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Brand" error={errors.brand?.message}>
            <input {...register("brand")} className={inputClass} />
          </Field>
          <Field label="Model" error={errors.model?.message}>
            <input {...register("model")} className={inputClass} />
          </Field>
        </div>

        <div className="mt-5">
          <Field label="Caption (optional)" error={errors.caption?.message}>
            <textarea {...register("caption")} rows={3} className={`${inputClass} resize-none py-3`} />
          </Field>
        </div>
      </section>

      {/* =====================================================
          MESSAGE
          ===================================================== */}
      {message && (
        <p className={`text-sm ${message.includes("successfully") ? "text-emerald-400" : "text-red-400"}`}>
          {message}
        </p>
      )}

      {/* =====================================================
          SUBMIT
          ===================================================== */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-13 flex-1 rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <a
          href="/admin/dashboard/deliveries"
          className="h-13 flex items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:border-white"
        >
          Cancel
        </a>

        <DeleteButton
          endpoint={`/api/admin/deliveries/${delivery.id}`}
          confirmMessage={`Delete this photo entry${
            delivery.brand || delivery.model
              ? ` (${[delivery.brand, delivery.model].filter(Boolean).join(" ")})`
              : ""
          }? This cannot be undone.`}
          redirectTo="/admin/dashboard/deliveries"
        />
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30";
