import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { saveLocalMediaFile, deleteLocalMediaFile, deleteMediaByUrl } from "@/lib/localStorage";

const schema = z.object({
  name: z.string().trim().min(1),
  title: z.string().trim().max(120).optional(),
  message: z.string().trim().max(800).optional(),
});

// Only still relevant for a photo saved before the move to local disk
// storage (see lib/localStorage.ts) — new uploads never touch this
// bucket, but an old URL pointing at it still needs to be cleaned up
// correctly when replaced.
const legacyBucket = "car-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 10 * 1024 * 1024;

export async function PATCH(request: Request) {
  let savedFilename: string | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const raw = formData.get("founder");
    const file = formData.get("photo");

    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Founder details are required." }, { status: 400 });
    }

    const validation = schema.safeParse(JSON.parse(raw));
    if (!validation.success) {
      return NextResponse.json({ error: "Please check the details and try again." }, { status: 400 });
    }

    supabase = await createClient();

    const update: Record<string, unknown> = {
      name: validation.data.name,
      title: validation.data.title || "",
      message: validation.data.message || "",
    };

    if (file instanceof File && file.size > 0) {
      if (!allowedTypes.has(file.type) || file.size > maxSize) {
        return NextResponse.json({ error: "Photo must be a JPG/PNG/WebP under 10 MB." }, { status: 400 });
      }

      const { data: current } = await supabase
        .from("founder_profile")
        .select("photo_url")
        .eq("id", "main")
        .maybeSingle();

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${crypto.randomUUID()}.${extension}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      update.photo_url = await saveLocalMediaFile(filename, buffer);
      savedFilename = filename;

      if (current?.photo_url) {
        await deleteMediaByUrl(supabase, current.photo_url, legacyBucket);
      }
    }

    const { data: updatedRows, error } = await supabase
      .from("founder_profile")
      .update(update)
      .eq("id", "main")
      .select("id");

    if (error) throw new Error(`Founder profile could not be updated: ${error.message}`);
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error("Save didn't go through — likely a missing database permission (RLS policy).");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (savedFilename) {
      await deleteLocalMediaFile(savedFilename).catch(() => {});
    }
    console.error("[founder] PATCH failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update founder profile." },
      { status: 500 }
    );
  }
}
