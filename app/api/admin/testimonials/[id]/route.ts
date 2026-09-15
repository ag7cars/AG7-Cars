import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";

const schema = z
  .object({
    customerName: z.string().trim().min(1),
    message: z.string().trim().min(1).max(600),
  })
  .partial();

const bucket = "car-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 10 * 1024 * 1024;

function storagePathFor(url: string): string | null {
  return url.split(`/${bucket}/`)[1] || null;
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
      const path = `testimonials/${id}-edit-${Date.now()}.${extension}`;
      const upload = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upload.error) throw new Error(`Upload failed: ${upload.error.message}`);
      uploadedPath = path;
      update.photo_url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

      const oldPath = current?.photo_url ? storagePathFor(current.photo_url) : null;
      if (oldPath) await supabase.storage.from(bucket).remove([oldPath]);
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
    if (supabase && uploadedPath) {
      await supabase.storage.from(bucket).remove([uploadedPath]);
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

    const path = storagePathFor(row.photo_url);
    if (path) {
      try {
        await supabase.storage.from(bucket).remove([path]);
      } catch (cleanupError) {
        console.error("[testimonials:id] cleanup failed:", cleanupError);
      }
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
