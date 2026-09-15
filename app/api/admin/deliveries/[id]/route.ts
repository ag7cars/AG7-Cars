import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { getYouTubeVideoId, toCanonicalYouTubeUrl } from "@/lib/youtube";

const deliveryUpdateSchema = z
  .object({
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    caption: z.string().trim().max(500).nullable(),
    // Videos only — switches media_url to a YouTube link instead of a
    // Supabase Storage file (see lib/youtube.ts).
    youtubeUrl: z.string().trim().min(1),
  })
  .partial();

const imageBucket = "car-images";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const maxImageSize = 50 * 1024 * 1024; // 50 MB
const maxVideoSize = 150 * 1024 * 1024; // 150 MB

function storagePathFor(url: string): string | null {
  const path = url.split(`/${imageBucket}/`)[1];
  return path || null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let uploadedPath: string | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const rawDelivery = formData.get("delivery");
    const rawFile = formData.get("media");

    if (typeof rawDelivery !== "string") {
      return NextResponse.json({ error: "Delivery details are required." }, { status: 400 });
    }

    let parsedDelivery: unknown;
    try {
      parsedDelivery = JSON.parse(rawDelivery);
    } catch {
      return NextResponse.json({ error: "Invalid delivery details." }, { status: 400 });
    }

    const validation = deliveryUpdateSchema.safeParse(parsedDelivery);
    if (!validation.success) {
      console.error("[deliveries:id] validation failed:", validation.error.flatten());
      return NextResponse.json(
        {
          error: "Please check the delivery details and try again.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

    if (file && validation.data.youtubeUrl) {
      return NextResponse.json(
        { error: "Choose either a file upload or a YouTube link, not both." },
        { status: 400 }
      );
    }

    supabase = await createClient();

    const { data: current, error: fetchError } = await supabase
      .from("deliveries")
      .select("media_type, media_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    if (validation.data.brand !== undefined) update.brand = validation.data.brand;
    if (validation.data.model !== undefined) update.model = validation.data.model;
    if (validation.data.caption !== undefined) update.caption = validation.data.caption;

    if (file) {
      const expectedTypes = current.media_type === "video" ? allowedVideoTypes : allowedImageTypes;
      if (!expectedTypes.has(file.type)) {
        return NextResponse.json(
          {
            error:
              current.media_type === "video"
                ? "Replacement must be an MP4/WebM/MOV video."
                : "Replacement must be a JPG/PNG/WebP photo.",
          },
          { status: 400 }
        );
      }

      const sizeLimit = current.media_type === "video" ? maxVideoSize : maxImageSize;
      if (file.size > sizeLimit) {
        return NextResponse.json(
          {
            error:
              current.media_type === "video"
                ? "Video is over the 150 MB upload limit — use a YouTube link instead for larger files."
                : "Photo is over the 50 MB limit.",
          },
          { status: 400 }
        );
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || (current.media_type === "video" ? "mp4" : "jpg");
      const path = `deliveries/${id}-edit-${Date.now()}.${extension}`;

      const upload = await supabase.storage.from(imageBucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

      if (upload.error) {
        throw new Error(`Upload failed: ${upload.error.message}`);
      }

      uploadedPath = path;
      update.media_url = supabase.storage.from(imageBucket).getPublicUrl(path).data.publicUrl;

      const oldPath = storagePathFor(current.media_url);
      if (oldPath) {
        await supabase.storage.from(imageBucket).remove([oldPath]);
      }
    } else if (validation.data.youtubeUrl) {
      const videoId = getYouTubeVideoId(validation.data.youtubeUrl);
      if (!videoId) {
        return NextResponse.json(
          { error: "That doesn't look like a valid YouTube link." },
          { status: 400 }
        );
      }

      const canonical = toCanonicalYouTubeUrl(videoId);
      if (canonical !== current.media_url) {
        update.media_url = canonical;

        // Only removes an actual Storage file — a YouTube link isn't
        // one, so storagePathFor returns null and this is a no-op.
        const oldPath = storagePathFor(current.media_url);
        if (oldPath) {
          await supabase.storage.from(imageBucket).remove([oldPath]);
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    // .select() so a silent RLS block (update "succeeds" but touches
    // zero rows, no error) surfaces as a real error instead of a
    // false "saved" response — see the matching note in DELETE below.
    const { data: updatedRows, error } = await supabase
      .from("deliveries")
      .update(update)
      .eq("id", id)
      .select("id");

    if (error) {
      throw new Error(`Delivery could not be updated: ${error.message}`);
    }

    if (!updatedRows || updatedRows.length === 0) {
      throw new Error(
        "Save didn't go through — likely a missing database permission (RLS policy) for updating deliveries."
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (supabase && uploadedPath) {
      await supabase.storage.from(imageBucket).remove([uploadedPath]);
    }

    console.error("[deliveries:id] PATCH failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update delivery." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: delivery, error: fetchError } = await supabase
      .from("deliveries")
      .select("media_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Delivery could not be looked up: ${fetchError.message}`);
    }
    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }

    // .select() after .delete() so we get back the row(s) actually
    // removed — without it, a delete silently blocked by a missing
    // RLS policy returns success with zero rows affected and no
    // error, which left the UI stuck on "Deleting…" forever instead
    // of showing that anything was wrong.
    const { data: deletedRows, error } = await supabase
      .from("deliveries")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      throw new Error(`Delivery could not be deleted: ${error.message}`);
    }

    if (!deletedRows || deletedRows.length === 0) {
      throw new Error(
        "Delete didn't go through — likely a missing database permission (RLS policy) for deleting deliveries."
      );
    }

    // Best-effort media cleanup — the record is already gone, so a
    // storage hiccup (or a YouTube-hosted entry with nothing to
    // remove) shouldn't surface as a failure.
    const path = storagePathFor(delivery.media_url);
    if (path) {
      try {
        await supabase.storage.from(imageBucket).remove([path]);
      } catch (cleanupError) {
        console.error("[deliveries:id] media cleanup failed:", cleanupError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[deliveries:id] DELETE failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete delivery." },
      { status: 500 }
    );
  }
}
