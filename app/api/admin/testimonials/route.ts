import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  customerName: z.string().trim().min(1),
  message: z.string().trim().min(1).max(600),
});

const bucket = "car-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
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

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Please add a customer photo." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type) || file.size > maxSize) {
      return NextResponse.json({ error: "Photo must be a JPG/PNG/WebP under 10 MB." }, { status: 400 });
    }

    supabase = await createClient();

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `testimonials/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) throw new Error(`Upload failed: ${upload.error.message}`);
    uploadedPath = path;

    const photoUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

    const { data, error } = await supabase
      .from("testimonials")
      .insert({
        customer_name: validation.data.customerName,
        message: validation.data.message,
        photo_url: photoUrl,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Testimonial could not be saved: ${error.message}`);

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    if (supabase && uploadedPath) {
      await supabase.storage.from(bucket).remove([uploadedPath]);
    }
    console.error("[testimonials] POST failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish testimonial." },
      { status: 500 }
    );
  }
}
