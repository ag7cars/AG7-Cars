import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { saveLocalMediaFile, deleteLocalMediaFile } from "@/lib/localStorage";

const carSchema = z.object({
  brand: z.string().trim().min(1),
  name: z.string().trim().min(1),
  price: z.number().positive(),
  currency: z.string().trim().min(1),
  category: z.enum(["Pre-Owned", "New", "Demo"]),
  status: z.enum(["available", "booked", "sold"]),
  km_driven: z.number().nonnegative().optional(),
  registration: z.string().trim().optional(),
  // 0 is a deliberate sentinel for "Unregistered" rather than a real
  // year, swapped for undefined before the range check runs.
  year: z
    .number()
    .int()
    .optional()
    .transform((v) => (v === 0 ? undefined : v))
    .refine((v) => v === undefined || (v >= 1900 && v <= 2100), {
      message: "Enter a valid year, or 0 for Unregistered",
    }),
  manufacturing_year: z.number().int().min(1900).max(2100).optional(),
  ownership: z.string().optional(),
  fuel: z.enum(["Petrol", "Diesel", "Hybrid", "Electric"]).optional(),
  body_type: z.string().optional(),
  engine: z.string().optional(),
  description: z.string().optional(),
});

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const savedFilenames: string[] = [];
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const rawCar = formData.get("car");
    const images = formData.getAll("images");

    if (typeof rawCar !== "string") {
      return NextResponse.json({ error: "Car details are required." }, { status: 400 });
    }

    let parsedCar: unknown;
    try {
      parsedCar = JSON.parse(rawCar);
    } catch {
      return NextResponse.json({ error: "Invalid car details." }, { status: 400 });
    }

    const validation = carSchema.safeParse(parsedCar);
    if (!validation.success) {
      console.error("[cars] validation failed:", validation.error.flatten());
      return NextResponse.json(
        {
          error: "Please check the car details and try again.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const files = images.filter((image): image is File => image instanceof File);
    if (files.length > 10) {
      return NextResponse.json({ error: "You can upload a maximum of 10 images." }, { status: 400 });
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

    // Includes the manufacturing year (when known) and the
    // dealership's city, e.g. "lamborghini-huracan-evo-2022-indore" —
    // more descriptive for search than brand+name alone. Existing
    // cars keep whatever slug they already have; this only shapes
    // slugs for cars published from here on.
    const slugParts = [
      validation.data.brand,
      validation.data.name,
      validation.data.manufacturing_year ? String(validation.data.manufacturing_year) : null,
      "indore",
    ].filter(Boolean);
    const slug = await generateUniqueSlug(supabase, slugify(slugParts.join("-")));

    const { data, error } = await supabase
      .from("cars")
      .insert({
        ...validation.data,
        slug,
        image_urls: imageUrls,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Car could not be saved: ${error.message}`);
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    for (const filename of savedFilenames) {
      await deleteLocalMediaFile(filename).catch(() => {});
    }

    console.error("[cars] POST failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish car." },
      { status: 500 }
    );
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function generateUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  baseSlug: string
) {
  const base = baseSlug || "car";
  let candidate = base;

  for (let attempt = 1; attempt <= 20; attempt++) {
    const { data } = await supabase
      .from("cars")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }

    candidate = `${base}-${attempt + 1}`;
  }

  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}