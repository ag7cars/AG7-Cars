import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { saveLocalMediaFile } from "@/lib/localStorage";

// One-time (repeatable) migration: pulls every photo/video still
// hosted on Supabase Storage across every table, saves a local copy
// via lib/localStorage.ts, and repoints the database at the new
// /api/media/... URL. Supabase Storage requests have to actually be
// reachable for this to work — if the project's quota is currently
// exceeded, this will fail the same way the rest of the site does
// until that's resolved (upgrade or wait for the billing cycle).
//
// Safe to run more than once: anything already local or already a
// non-Supabase link (YouTube/Instagram, or a static /images/ asset)
// is left untouched. Originals are NOT deleted from Supabase here —
// run DELETE on this same route once you've confirmed the site looks
// right, to actually reclaim storage quota.

const legacyBucket = "car-images";

type MigrationEntry = {
  table: string;
  id: string;
  field: string;
  from: string;
  to?: string;
  error?: string;
};

function isMigratable(url: string | null | undefined): url is string {
  if (!url) return false;
  if (url.startsWith("/api/media/")) return false; // already local
  if (url.startsWith("/images/")) return false; // static /public asset
  return url.includes(`/${legacyBucket}/`); // a real Supabase Storage URL
}

async function downloadAndSave(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const cleanPath = url.split("?")[0];
  const extension = cleanPath.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${crypto.randomUUID()}.${extension}`;
  return saveLocalMediaFile(filename, buffer);
}

/** A single url column (photo_url, image_url, media_url, ...). */
async function migrateSingleField(
  supabase: SupabaseClient,
  table: string,
  rows: { id: string; url: string | null }[],
  field: string
): Promise<MigrationEntry[]> {
  const entries: MigrationEntry[] = [];

  for (const row of rows) {
    if (!isMigratable(row.url)) continue;

    try {
      const newUrl = await downloadAndSave(row.url);
      const { error } = await supabase.from(table).update({ [field]: newUrl }).eq("id", row.id);
      if (error) throw new Error(error.message);
      entries.push({ table, id: row.id, field, from: row.url, to: newUrl });
    } catch (error) {
      entries.push({
        table,
        id: row.id,
        field,
        from: row.url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return entries;
}

/** An array-of-urls column (image_urls), with an optional single
    "cover" field (media_url) kept in sync with the array's first
    entry — cars/live_deals/deliveries all follow that pattern. */
async function migrateArrayField(
  supabase: SupabaseClient,
  table: string,
  rows: { id: string; urls: string[] | null }[],
  field: string,
  coverField?: string
): Promise<MigrationEntry[]> {
  const entries: MigrationEntry[] = [];

  for (const row of rows) {
    const urls = row.urls ?? [];
    if (!urls.some(isMigratable)) continue;

    const newUrls: string[] = [];
    let changed = false;

    for (const url of urls) {
      if (!isMigratable(url)) {
        newUrls.push(url);
        continue;
      }
      try {
        const newUrl = await downloadAndSave(url);
        newUrls.push(newUrl);
        changed = true;
        entries.push({ table, id: row.id, field, from: url, to: newUrl });
      } catch (error) {
        newUrls.push(url); // keep the original rather than lose the reference
        entries.push({
          table,
          id: row.id,
          field,
          from: url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (changed) {
      const update: Record<string, unknown> = { [field]: newUrls };
      if (coverField) update[coverField] = newUrls[0];
      const { error } = await supabase.from(table).update(update).eq("id", row.id);
      if (error) {
        entries.push({ table, id: row.id, field, from: "(row update)", error: error.message });
      }
    }
  }

  return entries;
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createClient();
  const entries: MigrationEntry[] = [];

  const { data: cars } = await supabase.from("cars").select("id, image_urls");
  entries.push(
    ...(await migrateArrayField(
      supabase,
      "cars",
      (cars ?? []).map((c) => ({ id: c.id, urls: c.image_urls })),
      "image_urls"
    ))
  );

  const { data: deals } = await supabase.from("live_deals").select("id, image_urls");
  entries.push(
    ...(await migrateArrayField(
      supabase,
      "live_deals",
      (deals ?? []).map((d) => ({ id: d.id, urls: d.image_urls })),
      "image_urls"
    ))
  );

  // Deliveries: image_urls for photo entries (media_url kept as the
  // array's cover), plus media_url directly for video entries still
  // hosted on Supabase Storage (from before videos moved to disk).
  const { data: deliveries } = await supabase
    .from("deliveries")
    .select("id, media_type, media_url, image_urls");
  const deliveryPhotos = (deliveries ?? []).filter((d) => d.media_type === "image");
  const deliveryVideos = (deliveries ?? []).filter((d) => d.media_type === "video");
  entries.push(
    ...(await migrateArrayField(
      supabase,
      "deliveries",
      deliveryPhotos.map((d) => ({ id: d.id, urls: d.image_urls })),
      "image_urls",
      "media_url"
    ))
  );
  entries.push(
    ...(await migrateSingleField(
      supabase,
      "deliveries",
      deliveryVideos.map((d) => ({ id: d.id, url: d.media_url })),
      "media_url"
    ))
  );

  const { data: testimonials } = await supabase.from("testimonials").select("id, photo_url");
  entries.push(
    ...(await migrateSingleField(
      supabase,
      "testimonials",
      (testimonials ?? []).map((t) => ({ id: t.id, url: t.photo_url })),
      "photo_url"
    ))
  );

  const { data: founder } = await supabase
    .from("founder_profile")
    .select("id, photo_url")
    .eq("id", "main")
    .maybeSingle();
  if (founder) {
    entries.push(
      ...(await migrateSingleField(
        supabase,
        "founder_profile",
        [{ id: founder.id, url: founder.photo_url }],
        "photo_url"
      ))
    );
  }

  const { data: heroImages } = await supabase.from("hero_images").select("id, image_url");
  entries.push(
    ...(await migrateSingleField(
      supabase,
      "hero_images",
      (heroImages ?? []).map((h) => ({ id: h.id, url: h.image_url })),
      "image_url"
    ))
  );

  const succeeded = entries.filter((e) => !e.error);
  const failed = entries.filter((e) => e.error);

  return NextResponse.json({
    migrated: succeeded.length,
    failed: failed.length,
    details: entries,
  });
}

// Deletes the given Supabase Storage paths — call this AFTER a POST
// migration has succeeded and the site's been checked, to actually
// free up the quota. Body: { paths: string[] } — the same paths
// listed under "supabaseCleanupPaths" in the GET response below.
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const paths = body?.paths;
  if (!Array.isArray(paths) || !paths.every((p) => typeof p === "string") || paths.length === 0) {
    return NextResponse.json({ error: "Provide a non-empty array of storage paths to delete." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.storage.from(legacyBucket).remove(paths);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: paths.length });
}

// Lists everything still on Supabase Storage across every table —
// use this before/after migrating to see what's left, and to build
// the "paths" list for the DELETE cleanup call above.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createClient();
  const remaining: { table: string; id: string; url: string }[] = [];

  const collect = (table: string, rows: { id: string; urls: (string | null)[] }[]) => {
    for (const row of rows) {
      for (const url of row.urls) {
        if (isMigratable(url)) remaining.push({ table, id: row.id, url });
      }
    }
  };

  const [{ data: cars }, { data: deals }, { data: deliveries }, { data: testimonials }, { data: founder }, { data: heroImages }] =
    await Promise.all([
      supabase.from("cars").select("id, image_urls"),
      supabase.from("live_deals").select("id, image_urls"),
      supabase.from("deliveries").select("id, media_url, image_urls"),
      supabase.from("testimonials").select("id, photo_url"),
      supabase.from("founder_profile").select("id, photo_url").eq("id", "main").maybeSingle(),
      supabase.from("hero_images").select("id, image_url"),
    ]);

  collect("cars", (cars ?? []).map((c) => ({ id: c.id, urls: c.image_urls ?? [] })));
  collect("live_deals", (deals ?? []).map((d) => ({ id: d.id, urls: d.image_urls ?? [] })));
  collect(
    "deliveries",
    (deliveries ?? []).map((d) => ({ id: d.id, urls: [...(d.image_urls ?? []), d.media_url] }))
  );
  collect("testimonials", (testimonials ?? []).map((t) => ({ id: t.id, urls: [t.photo_url] })));
  if (founder) collect("founder_profile", [{ id: founder.id, urls: [founder.photo_url] }]);
  collect("hero_images", (heroImages ?? []).map((h) => ({ id: h.id, urls: [h.image_url] })));

  const supabaseCleanupPaths = remaining.map((r) => r.url.split(`/${legacyBucket}/`)[1]).filter(Boolean);

  return NextResponse.json({
    remainingOnSupabase: remaining.length,
    remaining,
    supabaseCleanupPaths,
  });
}
