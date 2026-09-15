"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getYouTubeVideoId, isYouTubeUrl, toYouTubeThumbnailUrl } from "@/lib/youtube";
import { isInstagramUrl } from "@/lib/instagram";
import DeleteButton from "@/components/admin/DeleteButton";

const deliverySchema = z.object({
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  caption: z.string().trim().max(500, "Keep the caption under 500 characters").optional(),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;

export type EditableDelivery = DeliveryFormValues & {
  id: string;
  mediaUrl: string;
};

export default function EditDeliveryForm({ delivery }: { delivery: EditableDelivery }) {
  const router = useRouter();
  const currentIsYoutube = isYouTubeUrl(delivery.mediaUrl);
  const currentIsInstagram = isInstagramUrl(delivery.mediaUrl);

  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
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

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (newPreview) URL.revokeObjectURL(newPreview);

    if (!file) {
      setNewFile(null);
      setNewPreview(null);
      return;
    }

    setNewFile(file);
    setNewPreview(URL.createObjectURL(file));
  }

  const onSubmit: SubmitHandler<DeliveryFormValues> = async (values) => {
    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("delivery", JSON.stringify(values));
      if (newFile) formData.append("media", newFile);

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
          MEDIA
          ===================================================== */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-xl font-semibold">Delivery Video</h2>

        <div className="mt-6 flex flex-wrap gap-6">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Current</p>
            <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-white/10 bg-black">
              {currentIsYoutube ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toYouTubeThumbnailUrl(getYouTubeVideoId(delivery.mediaUrl)!)}
                  alt="Current video"
                  className="h-full w-full object-cover"
                />
              ) : currentIsInstagram ? (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-600/30 to-amber-500/30 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                  Instagram
                </div>
              ) : (
                <video src={delivery.mediaUrl} muted playsInline className="h-full w-full object-cover" />
              )}
            </div>
          </div>

          {newPreview && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-emerald-300">
                New (replaces current on save)
              </p>
              <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-emerald-400/40 bg-black">
                <video src={newPreview} muted playsInline className="h-full w-full object-cover" />
              </div>
            </div>
          )}
        </div>

        <label className="mt-6 flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:bg-white/[0.06]">
          Upload a Replacement Video File
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={pickFile}
            className="hidden"
          />
        </label>

        {(currentIsYoutube || currentIsInstagram) && (
          <p className="mt-6 border-t border-white/10 pt-6 text-xs text-white/40">
            Currently a {currentIsYoutube ? "YouTube" : "Instagram"} link — upload a file above to
            switch this to a directly-hosted video.
          </p>
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
          confirmMessage={`Delete this video${
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

/* ============================================================
   FIELD WRAPPER
   ============================================================ */

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

/* ============================================================
   INPUT STYLE
   ============================================================ */

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30";
