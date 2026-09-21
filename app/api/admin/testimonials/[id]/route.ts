import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { saveLocalMediaFile, deleteLocalMediaFile, deleteMediaByUrl } from "@/lib/localStorage";

const schema = z
  .object({
    customerName: z.string().trim().min(1),
    message: z.string().trim().min(1).max(600),
  })
  .partial();

// Only still relevant for a photo saved before the move to local disk
// storage (see lib/localStorage.ts) — new uploads never touch this
// bucket, but an old URL pointing at it still needs to be cleaned up
// correctly when replaced or removed.
const legacyBucket = "car-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 10 * 1024 * 1024;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let savedFilename: string | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const raw = formData.get("testimonial");
    const file = formData.get("photo");

    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Testimonial details are required." }, { status: 400 });
    }

    const validation = schema.safeParse(JSON.parse(raw));
    if (!validation.success) {
      return NextResponse.json({ error: "Please check the details and try again." }, { status: 400 });
    }

    supabase = await createClient();

    const update: Record<string, unknown> = {};
    if (validation.data.customerName !== undefined) update.customer_name = validation.data.customerName;
    if (validation.data.message !== undefined) update.message = validation.data.message;

    if (file instanceof File && file.size > 0) {
      if (!allowedTypes.has(file.type) || file.size > maxSize) {
        return NextResponse.json({ error: "Photo must be a JPG/PNG/WebP under 10 MB." }, { status: 400 });
      }

      const { data: current } = await supabase
        .from("testimonials")
        .select("photo_url")
        .eq("id", id)
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

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const { data: updatedRows, error } = await supabase
      .from("testimonials")
      .update(update)
      .eq("id", id)
      .select("id");

    if (error) throw new Error(`Testimonial could not be updated: ${error.message}`);
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error("Save didn't go through — likely a missing database permission (RLS policy).");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (savedFilename) {
      await deleteLocalMediaFile(savedFilename).catch(() => {});
    }
    console.error("[testimonials:id] PATCH failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update testimonial." },
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

    const { data: row, error: fetchError } = await supabase
      .from("testimonials")
      .select("photo_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw new Error(`Testimonial could not be looked up: ${fetchError.message}`);
    if (!row) return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });

    const { data: deletedRows, error } = await supabase
      .from("testimonials")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw new Error(`Testimonial could not be deleted: ${error.message}`);
    if (!deletedRows || deletedRows.length === 0) {
      throw new Error("Delete didn't go through — likely a missing database permission (RLS policy).");
    }

    try {
      await deleteMediaByUrl(supabase, row.photo_url, legacyBucket);
    } catch (cleanupError) {
      console.error("[testimonials:id] cleanup failed:", cleanupError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[testimonials:id] DELETE failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete testimonial." },
      { status: 500 }
    );
  }
}
