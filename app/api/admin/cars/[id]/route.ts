import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";

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

const imageBucket = "car-images";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 10 * 1024 * 1024;

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
          { error: "Images must be JPG, PNG, or WebP files smaller than 10 MB." },
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
      const folder = `${id}-edit-${Date.now()}`;

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

      // Clean up storage for any image the admin removed.
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

    const { error } = await supabase.from("cars").update(update).eq("id", id);

    if (error) {
      throw new Error(`Car could not be updated: ${error.message}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (supabase && uploadedPaths.length > 0) {
      await supabase.storage.from(imageBucket).remove(uploadedPaths);
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
    const paths: string[] = (car.image_urls ?? [])
      .map((url: string) => url.split(`/${imageBucket}/`)[1])
      .filter((path: string | undefined): path is string => Boolean(path));

    if (paths.length > 0) {
      try {
        await supabase.storage.from(imageBucket).remove(paths);
      } catch (cleanupError) {
        console.error("[cars:id] image cleanup failed:", cleanupError);
      }
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
