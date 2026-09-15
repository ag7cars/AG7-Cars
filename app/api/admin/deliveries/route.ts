import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { getYouTubeVideoId, toCanonicalYouTubeUrl } from "@/lib/youtube";
import { toCanonicalInstagramUrl } from "@/lib/instagram";
import { saveVideoFile, deleteVideoFile } from "@/lib/videoStorage";

const deliverySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  caption: z.string().trim().max(500).optional(),
  mediaKind: z.enum(["video", "photo"]),
  // Videos only — bypasses Supabase Storage (and its free-plan size
  // cap) entirely by storing the link directly as media_url.
  youtubeLinks: z.array(z.string().trim().min(1)).max(10).optional(),
  instagramLinks: z.array(z.string().trim().min(1)).max(10).optional(),
});

const imageBucket = "car-images";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const maxImageSize = 50 * 1024 * 1024; // 50 MB
const maxVideoSize = 150 * 1024 * 1024; // 150 MB
const maxFiles = 10;

export async function POST(request: Request) {
  const uploadedPaths: string[] = [];
  const savedVideoFilenames: string[] = [];
  const insertedIds: string[] = [];
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const rawDelivery = formData.get("delivery");
    const mediaEntries = formData.getAll("media");

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

    const files = mediaEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const youtubeLinks = validation.data.youtubeLinks ?? [];
    const instagramLinks = validation.data.instagramLinks ?? [];

    if ((youtubeLinks.length > 0 || instagramLinks.length > 0) && validation.data.mediaKind !== "video") {
      return NextResponse.json(
        { error: "YouTube/Instagram links are only supported for videos." },
        { status: 400 }
      );
    }

    if (files.length === 0 && youtubeLinks.length === 0 && instagramLinks.length === 0) {
      return NextResponse.json({ error: "Please add at least one photo or video." }, { status: 400 });
    }

    if (files.length + youtubeLinks.length + instagramLinks.length > maxFiles) {
      return NextResponse.json(
        { error: `You can add a maximum of ${maxFiles} photos/videos at once.` },
        { status: 400 }
      );
    }

    const youtubeVideoIds: string[] = [];
    for (const link of youtubeLinks) {
      const videoId = getYouTubeVideoId(link);
      if (!videoId) {
        return NextResponse.json({ error: `"${link}" doesn't look like a valid YouTube link.` }, { status: 400 });
      }
      youtubeVideoIds.push(videoId);
    }

    const instagramPermalinks: string[] = [];
    for (const link of instagramLinks) {
      const canonical = toCanonicalInstagramUrl(link);
      if (!canonical) {
        return NextResponse.json(
          { error: `"${link}" doesn't look like a valid Instagram post/reel link.` },
          { status: 400 }
        );
      }
      instagramPermalinks.push(canonical);
    }

    // Validate every file up front before uploading anything — and,
    // since the admin UI now has one dedicated page per media kind,
    // reject anything that doesn't match the page it was submitted
    // from (defense in depth on top of the client-side <input accept>).
    const expectFile = validation.data.mediaKind === "video" ? allowedVideoTypes : allowedImageTypes;
    const expectLabel = validation.data.mediaKind === "video" ? "an MP4/WebM/MOV video" : "a JPG/PNG/WebP photo";

    const fileKinds: ("image" | "video")[] = [];
    for (const file of files) {
      const isImage = allowedImageTypes.has(file.type);
      const isVideo = allowedVideoTypes.has(file.type);

      if (!isImage && !isVideo) {
        return NextResponse.json(
          { error: `"${file.name}" must be a JPG/PNG/WebP photo or an MP4/WebM/MOV video.` },
          { status: 400 }
        );
      }

      if (!expectFile.has(file.type)) {
        return NextResponse.json(
          { error: `"${file.name}" must be ${expectLabel} — this page only accepts ${validation.data.mediaKind}s.` },
          { status: 400 }
        );
      }

      const sizeLimit = isImage ? maxImageSize : maxVideoSize;
      if (file.size > sizeLimit) {
        return NextResponse.json(
          {
            error: isImage
              ? `"${file.name}" is over the 50 MB photo limit.`
              : `"${file.name}" is over the 80 MB video limit.`,
          },
          { status: 400 }
        );
      }

      fileKinds.push(isImage ? "image" : "video");
    }

    supabase = await createClient();

    for (const [index, file] of files.entries()) {
      const kind = fileKinds[index];
      const extension = file.name.split(".").pop()?.toLowerCase() || (kind === "image" ? "jpg" : "mp4");

      let mediaUrl: string;

      if (kind === "video") {
        // Videos go to this server's own disk instead of Supabase
        // Storage — see lib/videoStorage.ts for why (free-tier size
        // limits) and how (served back via app/api/media).
        const filename = `${crypto.randomUUID()}.${extension}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        mediaUrl = await saveVideoFile(filename, buffer);
        savedVideoFilenames.push(filename);
      } else {
        const path = `deliveries/${crypto.randomUUID()}.${extension}`;

        const upload = await supabase.storage.from(imageBucket).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

        if (upload.error) {
          throw new Error(`Upload failed for "${file.name}": ${upload.error.message}`);
        }

        uploadedPaths.push(path);
        mediaUrl = supabase.storage.from(imageBucket).getPublicUrl(path).data.publicUrl;
      }

      const { data, error } = await supabase
        .from("deliveries")
        .insert({
          brand: validation.data.brand,
          model: validation.data.model,
          caption: validation.data.caption || null,
          media_url: mediaUrl,
          media_type: kind,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Delivery could not be saved for "${file.name}": ${error.message}`);
      }

      insertedIds.push(data.id);
    }

    for (const videoId of youtubeVideoIds) {
      const { data, error } = await supabase
        .from("deliveries")
        .insert({
          brand: validation.data.brand,
          model: validation.data.model,
          caption: validation.data.caption || null,
          media_url: toCanonicalYouTubeUrl(videoId),
          media_type: "video",
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Delivery could not be saved for YouTube video "${videoId}": ${error.message}`);
      }

      insertedIds.push(data.id);
    }

    for (const permalink of instagramPermalinks) {
      const { data, error } = await supabase
        .from("deliveries")
        .insert({
          brand: validation.data.brand,
          model: validation.data.model,
          caption: validation.data.caption || null,
          media_url: permalink,
          media_type: "video",
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Delivery could not be saved for Instagram link "${permalink}": ${error.message}`);
      }

      insertedIds.push(data.id);
    }

    return NextResponse.json({ ids: insertedIds }, { status: 201 });
  } catch (error) {
    if (supabase) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(imageBucket).remove(uploadedPaths);
      }
      if (insertedIds.length > 0) {
        await supabase.from("deliveries").delete().in("id", insertedIds);
      }
    }
    for (const filename of savedVideoFilenames) {
      await deleteVideoFile(filename).catch(() => {});
    }

    console.error("[deliveries] POST failed:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish delivery." },
      { status: 500 }
    );
  }
}
