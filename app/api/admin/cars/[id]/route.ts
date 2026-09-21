import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { saveLocalMediaFile, deleteLocalMediaFile, deleteMediaByUrl } from "@/lib/localStorage";

// Same fields as the create schema, but every field is optional —
// this endpoint also serves quick single-field edits (e.g. just
// flipping status from the admin list) as well as full edits.
const carUpdateSchema = z
  .object({
    brand: z.string().trim().min(1),
    name: z.string().trim().min(1),
    price: z.number().positive(),
    currency: z.string().trim().min(1),
    category: z.enum(["Pre-Owned", "New", "Demo"]),
    status: z.enum(["available", "booked", "sold"]),
    km_driven: z.number().nonnegative().nullable(),
    registration: z.string().trim().nullable(),
    // 0 is a deliberate sentinel for "Unregistered" rather than a
    // real year, swapped for null before the range check runs.
    year: z
      .number()
      .int()
      .nullable()
      .transform((v) => (v === 0 ? null : v))
      .refine((v) => v === null || (v >= 1900 && v <= 2100), {
        message: "Enter a valid year, or 0 for Unregistered",
      }),
    manufacturing_year: z.number().int().min(1900).max(2100).nullable(),
    ownership: z.string().nullable(),
    fuel: z.enum(["Petrol", "Diesel", "Hybrid", "Electric"]).nullable(),
    body_type: z.string().nullable(),
    engine: z.string().nullable(),
    description: z.string().nullable(),
  })
  .partial();

// Only still relevant for images a car had from before the move to
// local disk storage (see lib/localStorage.ts) — new uploads never
// touch this bucket, but old URLs pointing at it still need to be
// cleaned up correctly when replaced or removed.
const legacyImageBucket = "car-images";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 50 * 1024 * 1024;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const savedFilenames: string[] = [];
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const rawCar = formData.get("car");
    const rawExistingImages = formData.get("existingImages");
    const newFiles = formData.getAll("images").filter(
      (entry): entry is File => entry instanceof File && entry.size > 0
    );

    if (typeof rawCar !== "string") {
      return NextResponse.json({ error: "Car details are required." }, { status: 400 });
    }

    let parsedCar: unknown;
    try {
      parsedCar = JSON.parse(rawCar);
    } catch {
      return NextResponse.json({ error: "Invalid car details." }, { status: 400 });
    }

    const validation = carUpdateSchema.safeParse(parsedCar);
    if (!validation.success) {
      console.error("[cars:id] validation failed:", validation.error.flatten());
      return NextResponse.json(
        {
          error: "Please check the car details and try again.",
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

    // Image list is only touched when the form actually sent one —
    // a status-only PATCH from the admin list won't include it.
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
        .from("cars")
        .select("slug, image_urls")
        .eq("id", id)
        .single();

      if (fetchError || !current) {
        return NextResponse.json({ error: "Car not found." }, { status: 404 });
      }

      const newImageUrls: string[] = [];

      for (const file of newFiles) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filename = `${crypto.randomUUID()}.${extension}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await saveLocalMediaFile(filename, buffer);
        savedFilenames.push(filename);
        newImageUrls.push(url);
      }

      update.image_urls = [...(existingImages as string[]), ...newImageUrls];

      // Clean up whichever image the admin removed, wherever it
      // actually lives (local disk or, for a car not yet migrated,
      // the legacy Supabase bucket).
      const previousUrls: string[] = current.image_urls ?? [];
      const keptSet = new Set(existingImages as string[]);
      const removedUrls = previousUrls.filter((url) => !keptSet.has(url));

      for (const url of removedUrls) {
        await deleteMediaByUrl(supabase, url, legacyImageBucket);
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const { error } = await supabase.from("cars").update(update).eq("id", id);

    if (error) {
      throw new Error(`Car could not be updated: ${error.message}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    for (const filename of savedFilenames) {
      await deleteLocalMediaFile(filename).catch(() => {});
    }

    console.error("[cars:id] PATCH failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update car." },
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

    const { data: car, error: fetchError } = await supabase
      .from("cars")
      .select("image_urls")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Car could not be looked up: ${fetchError.message}`);
    }
    if (!car) {
      return NextResponse.json({ error: "Car not found." }, { status: 404 });
    }

    const { error } = await supabase.from("cars").delete().eq("id", id);

    if (error) {
      throw new Error(`Car could not be deleted: ${error.message}`);
    }

    // Best-effort image cleanup — the record is already gone at this
    // point, so a storage hiccup here shouldn't surface as a failure.
    try {
      for (const url of car.image_urls ?? []) {
        await deleteMediaByUrl(supabase, url, legacyImageBucket);
      }
    } catch (cleanupError) {
      console.error("[cars:id] image cleanup failed:", cleanupError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cars:id] DELETE failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete car." },
      { status: 500 }
    );
  }
}
