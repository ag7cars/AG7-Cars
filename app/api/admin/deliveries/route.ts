import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { saveLocalMediaFile, deleteLocalMediaFile } from "@/lib/localStorage";

const deliverySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  caption: z.string().trim().max(500).optional(),
  mediaKind: z.enum(["video", "photo"]),
});

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const maxImageSize = 50 * 1024 * 1024; // 50 MB
const maxVideoSize = 150 * 1024 * 1024; // 150 MB
const maxFiles = 10;

export async function POST(request: Request) {
  const savedFilenames: string[] = [];
  const insertedIds: string[] = [];
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const rawDelivery = formData.get("delivery");

    if (typeof rawDelivery !== "string") {
      return NextResponse.json({ error: "Delivery details are required." }, { status: 400 });
    }

    let parsedDelivery: unknown;
    try {
      parsedDelivery = JSON.parse(rawDelivery);
    } catch {
      return NextResponse.json({ error: "Invalid delivery details." }, { status: 400 });
    }

    const validation = deliverySchema.safeParse(parsedDelivery);
    if (!validation.success) {
      console.error("[deliveries] validation failed:", validation.error.flatten());
      return NextResponse.json(
        {
          error: "Please check the delivery details and try again.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    supabase = await createClient();

    if (validation.data.mediaKind === "photo") {
      // Photos for ONE delivery entry — image_urls[0] becomes the
      // cover shown on the landing page and grid; the rest show on
      // the entry's own detail page (same pattern as cars/live_deals).
      const files = formData
        .getAll("images")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);

      if (files.length === 0) {
        return NextResponse.json({ error: "Please add at least one photo." }, { status: 400 });
      }
      if (files.length > maxFiles) {
        return NextResponse.json(
          { error: `You can add a maximum of ${maxFiles} photos at once.` },
          { status: 400 }
        );
      }

      for (const file of files) {
        if (!allowedImageTypes.has(file.type) || file.size > maxImageSize) {
          return NextResponse.json(
            { error: `"${file.name}" must be a JPG/PNG/WebP photo under 50 MB.` },
            { status: 400 }
          );
        }
      }

      const imageUrls: string[] = [];

      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filename = `${crypto.randomUUID()}.${extension}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await saveLocalMediaFile(filename, buffer);
        savedFilenames.push(filename);
        imageUrls.push(url);
      }

      const { data, error } = await supabase
        .from("deliveries")
        .insert({
          brand: validation.data.brand,
          model: validation.data.model,
          caption: validation.data.caption || null,
          media_url: imageUrls[0],
          media_type: "image",
          image_urls: imageUrls,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Delivery could not be saved: ${error.message}`);
      }

      insertedIds.push(data.id);
    } else {
      // Videos — each uploaded file becomes its own separate delivery
      // entry (unlike photos, videos aren't grouped into one gallery).
      const files = formData
        .getAll("media")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);

      if (files.length === 0) {
        return NextResponse.json({ error: "Please add at least one video." }, { status: 400 });
      }
      if (files.length > maxFiles) {
        return NextResponse.json(
          { error: `You can add a maximum of ${maxFiles} videos at once.` },
          { status: 400 }
        );
      }

      for (const file of files) {
        if (!allowedVideoTypes.has(file.type)) {
          return NextResponse.json(
            { error: `"${file.name}" must be an MP4/WebM/MOV video.` },
            { status: 400 }
          );
        }
        if (file.size > maxVideoSize) {
          return NextResponse.json(
            { error: `"${file.name}" is over the 150 MB video limit.` },
            { status: 400 }
          );
        }
      }

      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";

        // Videos go to this server's own disk instead of Supabase
        // Storage — see lib/localStorage.ts for why (free-tier size
        // limits) and how (served back via app/api/media).
        const filename = `${crypto.randomUUID()}.${extension}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const mediaUrl = await saveLocalMediaFile(filename, buffer);
        savedFilenames.push(filename);

        const { data, error } = await supabase
          .from("deliveries")
          .insert({
            brand: validation.data.brand,
            model: validation.data.model,
            caption: validation.data.caption || null,
            media_url: mediaUrl,
            media_type: "video",
          })
          .select("id")
          .single();

        if (error) {
          throw new Error(`Delivery could not be saved for "${file.name}": ${error.message}`);
        }

        insertedIds.push(data.id);
      }
    }

    return NextResponse.json({ ids: insertedIds }, { status: 201 });
  } catch (error) {
    if (supabase && insertedIds.length > 0) {
      await supabase.from("deliveries").delete().in("id", insertedIds);
    }
    for (const filename of savedFilenames) {
      await deleteLocalMediaFile(filename).catch(() => {});
    }

    console.error("[deliveries] POST failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish delivery." },
      { status: 500 }
    );
  }
}
