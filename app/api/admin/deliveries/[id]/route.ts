import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { saveVideoFile, deleteVideoFile, isLocalVideoUrl, filenameFromLocalVideoUrl } from "@/lib/videoStorage";

const deliveryUpdateSchema = z
  .object({
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    caption: z.string().trim().max(500).nullable(),
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
  const uploadedPaths: string[] = [];
  let savedVideoFilename: string | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const rawDelivery = formData.get("delivery");
    const rawFile = formData.get("media");
    const rawExistingImages = formData.get("existingImages");
    const newImageFiles = formData
      .getAll("images")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

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

    supabase = await createClient();

    const { data: current, error: fetchError } = await supabase
      .from("deliveries")
      .select("media_type, media_url, image_urls")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    if (validation.data.brand !== undefined) update.brand = validation.data.brand;
    if (validation.data.model !== undefined) update.model = validation.data.model;
    if (validation.data.caption !== undefined) update.caption = validation.data.caption;

    if (file && current.media_type === "video") {
      if (!allowedVideoTypes.has(file.type)) {
        return NextResponse.json(
          { error: "Replacement must be an MP4/WebM/MOV video." },
          { status: 400 }
        );
      }

      if (file.size > maxVideoSize) {
        return NextResponse.json(
          { error: "Video is over the 150 MB upload limit." },
          { status: 400 }
        );
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";

      // Videos go to this server's own disk instead of Supabase
      // Storage — see lib/videoStorage.ts.
      const filename = `${id}-edit-${Date.now()}.${extension}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      update.media_url = await saveVideoFile(filename, buffer);
      savedVideoFilename = filename;

      if (isLocalVideoUrl(current.media_url)) {
        const oldFilename = filenameFromLocalVideoUrl(current.media_url);
        if (oldFilename) await deleteVideoFile(oldFilename);
      } else {
        const oldPath = storagePathFor(current.media_url);
        if (oldPath) await supabase.storage.from(imageBucket).remove([oldPath]);
      }
    } else if (current.media_type === "image" && typeof rawExistingImages === "string") {
      // Gallery edit — reordered/kept URLs plus any newly uploaded
      // photos, same pattern as cars/live_deals (see lib pattern).
      let existingImages: unknown;
      try {
        existingImages = JSON.parse(rawExistingImages);
      } catch {
        return NextResponse.json({ error: "Invalid image list." }, { status: 400 });
      }

      if (!Array.isArray(existingImages) || !existingImages.every((u) => typeof u === "string")) {
        return NextResponse.json({ error: "Invalid image list." }, { status: 400 });
      }

      for (const file of newImageFiles) {
        if (!allowedImageTypes.has(file.type) || file.size > maxImageSize) {
          return NextResponse.json(
            { error: `"${file.name}" must be a JPG/PNG/WebP photo under 50 MB.` },
            { status: 400 }
          );
        }
      }

      if (existingImages.length + newImageFiles.length === 0) {
        return NextResponse.json({ error: "Please keep at least one photo." }, { status: 400 });
      }

      const newImageUrls: string[] = [];
      const folder = `deliveries/${id}-edit-${Date.now()}`;

      for (const [index, file] of newImageFiles.entries()) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${folder}/${String(index + 1).padStart(2, "0")}.${extension}`;

        const upload = await supabase.storage.from(imageBucket).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

        if (upload.error) {
          throw new Error(`Upload failed: ${upload.error.message}`);
        }

        uploadedPaths.push(path);
        newImageUrls.push(supabase.storage.from(imageBucket).getPublicUrl(path).data.publicUrl);
      }

      const finalImageUrls = [...(existingImages as string[]), ...newImageUrls];
      update.image_urls = finalImageUrls;
      update.media_url = finalImageUrls[0];

      // Clean up storage for any photo the admin removed.
      const previousUrls: string[] = current.image_urls ?? [current.media_url];
      const keptSet = new Set(existingImages as string[]);
      const removedPaths = previousUrls
        .filter((url) => !keptSet.has(url))
        .map((url) => storagePathFor(url))
        .filter((path): path is string => Boolean(path));

      if (removedPaths.length > 0) {
        await supabase.storage.from(imageBucket).remove(removedPaths);
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
    if (supabase && uploadedPaths.length > 0) {
      await supabase.storage.from(imageBucket).remove(uploadedPaths);
    }
    if (savedVideoFilename) {
      await deleteVideoFile(savedVideoFilename).catch(() => {});
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
      .select("media_url, image_urls")
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
    // storage hiccup (or a YouTube/Instagram-hosted entry with
    // nothing to remove) shouldn't surface as a failure.
    try {
      if (isLocalVideoUrl(delivery.media_url)) {
        const filename = filenameFromLocalVideoUrl(delivery.media_url);
        if (filename) await deleteVideoFile(filename);
      } else if (delivery.image_urls?.length) {
        const paths = delivery.image_urls
          .map((url: string) => storagePathFor(url))
          .filter((path: string | null): path is string => Boolean(path));
        if (paths.length > 0) await supabase.storage.from(imageBucket).remove(paths);
      } else {
        const path = storagePathFor(delivery.media_url);
        if (path) await supabase.storage.from(imageBucket).remove([path]);
      }
    } catch (cleanupError) {
      console.error("[deliveries:id] media cleanup failed:", cleanupError);
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
