"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const deliverySchema = z.object({
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  caption: z.string().trim().max(500, "Keep the caption under 500 characters").optional(),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;

const imageTypes = "image/jpeg,image/png,image/webp";
const videoTypes = "video/mp4,video/webm,video/quicktime";

export type DeliveryMediaKind = "video" | "photo";

type PickedFile = {
  file: File;
  preview: string;
  isVideo: boolean;
};

export default function AddDeliveryForm({ mediaKind }: { mediaKind: DeliveryMediaKind }) {
  const isVideoForm = mediaKind === "video";
  const acceptTypes = isVideoForm ? videoTypes : imageTypes;
  const mediaLabel = isVideoForm ? "video" : "photo";
  const mediaLabelPlural = isVideoForm ? "videos" : "photos";

  const [items, setItems] = useState<PickedFile[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = items.length;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
  });

  // Clean up object URLs when items change/unmount.
  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selected.length === 0) return;

    const mismatched = selected.filter((file) =>
      isVideoForm ? !file.type.startsWith("video/") : !file.type.startsWith("image/")
    );

    if (mismatched.length > 0) {
      setMessage(
        isVideoForm
          ? "This page is for videos only — please add MP4/WebM/MOV files."
          : "This page is for photos only — please add JPG/PNG/WebP files."
      );
      return;
    }

    const next: PickedFile[] = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));

    setMessage("");
    setItems((current) => {
      const combined = [...current, ...next];
      const allowed = combined.slice(0, 10);

      if (combined.length > allowed.length) {
        setMessage(`You can add a maximum of 10 ${mediaLabelPlural} at once.`);
      }

      return allowed;
    });
  }

  function removeItem(index: number) {
    setItems((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((_, i) => i !== index);
    });
  }

  const onSubmit: SubmitHandler<DeliveryFormValues> = async (values) => {
    if (totalCount === 0) {
      setMessage(`Please add at least one ${mediaLabel}.`);
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("delivery", JSON.stringify({ ...values, mediaKind }));
      items.forEach((item) => {
        formData.append("media", item.file);
      });

      const response = await fetch("/api/admin/deliveries", {
        method: "POST",
        body: formData,
      });

      const result = await safeParseJson(response);

      if (!response.ok) {
        const detailText = result.details
          ? ` (${JSON.stringify(result.details.fieldErrors ?? result.details)})`
          : "";
        throw new Error(
          (result.error || `Something went wrong (status ${response.status}).`) + detailText
        );
      }

      setMessage(
        totalCount > 1
          ? `${totalCount} ${mediaLabelPlural} successfully published.`
          : `${isVideoForm ? "Video" : "Photo"} successfully published.`
      );

      items.forEach((item) => URL.revokeObjectURL(item.preview));
      reset({ brand: "", model: "", caption: "" });
      setItems([]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8"
    >

      {/* =====================================================
          MEDIA
          ===================================================== */}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">

        <h2 className="text-xl font-semibold">
          {isVideoForm ? "Delivery Videos" : "Delivery Photos"}
        </h2>

        <p className="mt-2 text-sm text-white/50">
          Add one or more {mediaLabelPlural} — each becomes its own
          entry in AG7 Deliveries {isVideoForm ? "Videos" : "Photos"},
          using the Brand and Model below. Up to 10 at a time.
          {isVideoForm && <> Uploaded files are stored directly on the server (up to 150 MB each).</>}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          multiple
          onChange={addFiles}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={totalCount >= 10}
          className="mt-6 flex w-full items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-sm font-medium text-white/70 transition hover:border-white/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {items.length === 0
            ? `Add ${isVideoForm ? "Videos" : "Photos"}`
            : `Add More (${totalCount}/10)`}
        </button>

        {items.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((item, index) => (
              <div
                key={`${item.file.name}-${item.file.lastModified}-${index}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-black"
              >
                <div className="relative aspect-square w-full">
                  {item.isVideo ? (
                    <video
                      src={item.preview}
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.preview}
                      alt={`Delivery photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  )}

                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    {item.isVideo ? "Video" : "Photo"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  aria-label="Remove"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white/80 transition hover:bg-red-500/70 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

      </section>


      {/* =====================================================
          BRAND & MODEL
          ===================================================== */}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">

        <h2 className="text-xl font-semibold">
          Brand &amp; Model
        </h2>

        <p className="mt-2 text-sm text-white/50">
          Shown on the landing page next to every photo/video added above.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Brand"
            error={errors.brand?.message}
          >
            <input
              {...register("brand")}
              placeholder="Range Rover"
              className={inputClass}
            />
          </Field>

          <Field
            label="Model"
            error={errors.model?.message}
          >
            <input
              {...register("model")}
              placeholder="Velar 2L HSE"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-5">
          <Field
            label="Caption (optional)"
            error={errors.caption?.message}
          >
            <textarea
              {...register("caption")}
              rows={3}
              placeholder="A short caption for this delivery…"
              className={`${inputClass} resize-none py-3`}
            />
          </Field>
        </div>

      </section>


      {/* =====================================================
          MESSAGE
          ===================================================== */}

      {message && (
        <p
          className={`text-sm ${
            message.includes("successfully")
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}


      {/* =====================================================
          SUBMIT
          ===================================================== */}

      <button
        type="submit"
        disabled={saving}
        className="h-13 w-full rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Publishing…" : `Publish ${isVideoForm ? "Video" : "Photo"}`}
      </button>

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
      <label className="mb-1.5 block text-sm font-medium text-white/70">
        {label}
      </label>

      {children}

      {error && (
        <p className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}


/* ============================================================
   INPUT STYLE
   ============================================================ */

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30";


/* ============================================================
   SAFE RESPONSE PARSING
   ============================================================ */
async function safeParseJson(
  response: Response
): Promise<{ error?: string; ids?: string[]; details?: { fieldErrors?: Record<string, string[]> } }> {
  const text = await response.text();

  if (!text) {
    return { error: `Empty response from server (status ${response.status}).` };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `Unexpected response from server (status ${response.status}): ${text.slice(0, 200)}`,
    };
  }
}
