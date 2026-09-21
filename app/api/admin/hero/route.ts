import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { saveLocalMediaFile, deleteLocalMediaFile, deleteMediaByUrl } from "@/lib/localStorage";

const paramsSchema = z.object({
  slot: z.enum(["desktop", "mobile"]),
  position: z.coerce.number().int().min(1).max(4),
});

// Only still relevant for a hero photo saved before the move to local
// disk storage (see lib/localStorage.ts) — new uploads never touch
// this bucket, but an old URL pointing at it still needs to be
// cleaned up correctly when replaced.
const legacyImageBucket = "car-images";
const allowedImageTypes = new Set(["image/jpeg"]);
const maxImageSize = 50 * 1024 * 1024; // 50 MB

export async function PUT(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let savedFilename: string | null = null;

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
    // Supabase Storage or on local disk; the seeded defaults are
    // static files under /public/images and have nothing to delete
    // there (deleteMediaByUrl no-ops for those automatically).
    const { data: existing } = await supabase
      .from("hero_images")
      .select("image_url")
      .eq("slot", slot)
      .eq("position", position)
      .maybeSingle();

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await saveLocalMediaFile(filename, buffer);
    savedFilename = filename;

    const { error } = await supabase
      .from("hero_images")
      .upsert(
        { slot, position, image_url: imageUrl, updated_at: new Date().toISOString() },
        { onConflict: "slot,position" }
      );

    if (error) {
      throw new Error(`Could not save the new photo: ${error.message}`);
    }

    if (existing?.image_url) {
      await deleteMediaByUrl(supabase, existing.image_url, legacyImageBucket);
    }

    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error) {
    if (savedFilename) {
      await deleteLocalMediaFile(savedFilename).catch(() => {});
    }

    console.error("[hero] PUT failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update photo." },
      { status: 500 }
    );
  }
}
