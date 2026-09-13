import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";

const liveDealUpdateSchema = z
  .object({
    brand: z.string().trim().min(1),
    name: z.string().trim().min(1),
    original_price: z.number().positive(),
    deal_price: z.number().positive(),
    currency: z.string().trim().min(1),
    description: z.string().nullable(),
  })
  .partial();

const imageBucket = "car-images";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 50 * 1024 * 1024;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const uploadedPaths: string[] = [];
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const rawDeal = formData.get("deal");
    const rawExistingImages = formData.get("existingImages");
    const newFiles = formData.getAll("images").filter(
      (entry): entry is File => entry instanceof File && entry.size > 0
    );

    if (typeof rawDeal !== "string") {
      return NextResponse.json({ error: "Deal details are required." }, { status: 400 });
    }

    let parsedDeal: unknown;
    try {
      parsedDeal = JSON.parse(rawDeal);
    } catch {
      return NextResponse.json({ error: "Invalid deal details." }, { status: 400 });
    }

    const validation = liveDealUpdateSchema.safeParse(parsedDeal);
    if (!validation.success) {
      console.error("[live-deals:id] validation failed:", validation.error.flatten());
      return NextResponse.json(
        {
          error: "Please check the deal details and try again.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    for (const file of newFiles) {
      if (!allowedImageTypes.has(file.type) || file.size > maxImageSize) {
        return NextResponse.json(
          { error: "Images must be JPG, PNG, or WebP files smaller than 50 MB." },
          { status: 400 }
        );
      }
    }

    supabase = await createClient();
    const update: Record<string, unknown> = { ...validation.data };

    if (typeof rawExistingImages === "string") {
      let existingImages: unknown;
      try {
        existingImages = JSON.parse(rawExistingImages);
      } catch {
        return NextResponse.json({ error: "Invalid image list." }, { status: 400 });
      }

      if (!Array.isArray(existingImages) || !existingImages.every((u) => typeof u === "string")) {
        return NextResponse.json({ error: "Invalid image list." }, { status: 400 });
      }

      const { data: current, error: fetchError } = await supabase
        .from("live_deals")
        .select("brand, name, image_urls")
        .eq("id", id)
        .single();

      if (fetchError || !current) {
        return NextResponse.json({ error: "Live deal not found." }, { status: 404 });
      }

      const newImageUrls: string[] = [];
      const folder = `live-deals/${id}-edit-${Date.now()}-${slugify(
        `${validation.data.brand ?? current.brand}-${validation.data.name ?? current.name}`
      )}`;

      for (const [index, file] of newFiles.entries()) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${folder}/${String(index + 1).padStart(2, "0")}.${extension}`;
        const upload = await supabase.storage.from(imageBucket).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

        if (upload.error) {
          throw new Error(`Image upload failed: ${upload.error.message}`);
        }

        uploadedPaths.push(path);
        newImageUrls.push(supabase.storage.from(imageBucket).getPublicUrl(path).data.publicUrl);
      }

      update.image_urls = [...(existingImages as string[]), ...newImageUrls];

      const previousUrls: string[] = current.image_urls ?? [];
      const keptSet = new Set(existingImages as string[]);
      const removedPaths = previousUrls
        .filter((url) => !keptSet.has(url))
        .map((url) => url.split(`/${imageBucket}/`)[1])
        .filter((path): path is string => Boolean(path));

      if (removedPaths.length > 0) {
        await supabase.storage.from(imageBucket).remove(removedPaths);
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const { error } = await supabase.from("live_deals").update(update).eq("id", id);

    if (error) {
      throw new Error(`Live deal could not be updated: ${error.message}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (supabase && uploadedPaths.length > 0) {
      await supabase.storage.from(imageBucket).remove(uploadedPaths);
    }

    console.error("[live-deals:id] PATCH failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update live deal." },
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

    const { data: deal, error: fetchError } = await supabase
      .from("live_deals")
      .select("image_urls")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Live deal could not be looked up: ${fetchError.message}`);
    }
    if (!deal) {
      return NextResponse.json({ error: "Live deal not found." }, { status: 404 });
    }

    const { error } = await supabase.from("live_deals").delete().eq("id", id);

    if (error) {
      throw new Error(`Live deal could not be deleted: ${error.message}`);
    }

    // Best-effort image cleanup — the record is already gone at this
    // point, so a storage hiccup here shouldn't surface as a failure.
    const paths: string[] = (deal.image_urls ?? [])
      .map((url: string) => url.split(`/${imageBucket}/`)[1])
      .filter((path: string | undefined): path is string => Boolean(path));

    if (paths.length > 0) {
      try {
        await supabase.storage.from(imageBucket).remove(paths);
      } catch (cleanupError) {
        console.error("[live-deals:id] image cleanup failed:", cleanupError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[live-deals:id] DELETE failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete live deal." },
      { status: 500 }
    );
  }
}
