import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { saveLocalMediaFile, deleteLocalMediaFile } from "@/lib/localStorage";

const liveDealSchema = z.object({
  brand: z.string().trim().min(1),
  name: z.string().trim().min(1),
  original_price: z.number().positive(),
  deal_price: z.number().positive(),
  currency: z.string().trim().min(1),
  category: z.enum(["Pre-Owned", "New", "Demo"]),
  description: z.string().optional(),
});

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 50 * 1024 * 1024; // 50 MB
const maxFiles = 10;

export async function POST(request: Request) {
  const savedFilenames: string[] = [];
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const rawDeal = formData.get("deal");
    const images = formData.getAll("images");

    if (typeof rawDeal !== "string") {
      return NextResponse.json({ error: "Deal details are required." }, { status: 400 });
    }

    let parsedDeal: unknown;
    try {
      parsedDeal = JSON.parse(rawDeal);
    } catch {
      return NextResponse.json({ error: "Invalid deal details." }, { status: 400 });
    }

    const validation = liveDealSchema.safeParse(parsedDeal);
    if (!validation.success) {
      console.error("[live-deals] validation failed:", validation.error.flatten());
      return NextResponse.json(
        {
          error: "Please check the deal details and try again.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const files = images.filter((image): image is File => image instanceof File && image.size > 0);

    if (files.length > maxFiles) {
      return NextResponse.json({ error: `You can upload a maximum of ${maxFiles} images.` }, { status: 400 });
    }

    for (const file of files) {
      if (!allowedImageTypes.has(file.type) || file.size > maxImageSize) {
        return NextResponse.json(
          { error: "Images must be JPG, PNG, or WebP files smaller than 50 MB." },
          { status: 400 }
        );
      }
    }

    supabase = await createClient();
    const imageUrls: string[] = [];

    // Images are saved straight to this server's own disk instead of
    // Supabase Storage — see lib/localStorage.ts — served back out
    // through app/api/media, same as delivery videos already were.
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${crypto.randomUUID()}.${extension}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await saveLocalMediaFile(filename, buffer);
      savedFilenames.push(filename);
      imageUrls.push(url);
    }

    const { data, error } = await supabase
      .from("live_deals")
      .insert({
        ...validation.data,
        image_urls: imageUrls,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Live deal could not be saved: ${error.message}`);
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    for (const filename of savedFilenames) {
      await deleteLocalMediaFile(filename).catch(() => {});
    }

    console.error("[live-deals] POST failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish live deal." },
      { status: 500 }
    );
  }
}
