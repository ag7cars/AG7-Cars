import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";

const paramsSchema = z.object({
  slot: z.enum(["desktop", "mobile"]),
  position: z.coerce.number().int().min(1).max(4),
});

const imageBucket = "car-images";
const allowedImageTypes = new Set(["image/jpeg"]);
const maxImageSize = 50 * 1024 * 1024; // 50 MB

export async function PUT(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let uploadedPath: string | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const validation = paramsSchema.safeParse({
      slot: formData.get("slot"),
      position: formData.get("position"),
    });

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid slot or position." }, { status: 400 });
    }

    const { slot, position } = validation.data;

    const file = formData.get("media");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Please choose a photo." }, { status: 400 });
    }

    if (!allowedImageTypes.has(file.type)) {
      return NextResponse.json(
        { error: "Photo must be a JPG/JPEG file." },
        { status: 400 }
      );
    }

    if (file.size > maxImageSize) {
      return NextResponse.json({ error: "Photo is over the 50 MB limit." }, { status: 400 });
    }

    supabase = await createClient();

    // Look up whatever's currently in this slot so the old file can
    // be cleaned up afterward — but only if it actually lives in
    // Supabase Storage; the seeded defaults are static files under
    // /public/images and have nothing to delete there.
    const { data: existing } = await supabase
      .from("hero_images")
      .select("image_url")
      .eq("slot", slot)
      .eq("position", position)
      .maybeSingle();

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `hero/${slot}-${position}-${crypto.randomUUID()}.${extension}`;

    const upload = await supabase.storage.from(imageBucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (upload.error) {
      throw new Error(`Upload failed: ${upload.error.message}`);
    }

    uploadedPath = path;

    const imageUrl = supabase.storage.from(imageBucket).getPublicUrl(path).data.publicUrl;

    const { error } = await supabase
      .from("hero_images")
      .upsert(
        { slot, position, image_url: imageUrl, updated_at: new Date().toISOString() },
        { onConflict: "slot,position" }
      );

    if (error) {
      throw new Error(`Could not save the new photo: ${error.message}`);
    }

    if (existing?.image_url && existing.image_url.includes(`/storage/v1/object/public/${imageBucket}/`)) {
      const oldPath = existing.image_url.split(`/storage/v1/object/public/${imageBucket}/`)[1];
      if (oldPath) {
        await supabase.storage.from(imageBucket).remove([oldPath]);
      }
    }

    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error) {
    if (supabase && uploadedPath) {
      await supabase.storage.from(imageBucket).remove([uploadedPath]);
    }

    console.error("[hero] PUT failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update photo." },
      { status: 500 }
    );
  }
}
