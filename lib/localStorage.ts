import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";

// A generic version of the same idea lib/videoStorage.ts introduced
// for videos — files saved directly on this server's own disk
// instead of Supabase Storage, served back out through
// app/api/media/[filename]. Used for both images and videos now, so
// this is the one place upload routes should reach for either.
//
// MEDIA_STORAGE_DIR is the folder to use, and it must live OUTSIDE
// this project's deployed code (e.g. a sibling folder on the
// Hostinger account) so a redeploy of the app itself never touches
// previously uploaded files. Falls back to VIDEO_STORAGE_DIR — the
// env var name videos already used — so an existing Hostinger setup
// keeps working without renaming anything; falls back again to a
// local project folder in dev, where neither external folder exists.
const storageDir =
  process.env.MEDIA_STORAGE_DIR ||
  process.env.VIDEO_STORAGE_DIR ||
  path.join(process.cwd(), ".media-storage");

export const localMediaUrlPrefix = "/api/media/";

function assertSafeFilename(filename: string) {
  if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new Error("Invalid filename.");
  }
}

export function isLocalMediaUrl(url: string): boolean {
  return url.startsWith(localMediaUrlPrefix);
}

export function filenameFromLocalMediaUrl(url: string): string | null {
  if (!isLocalMediaUrl(url)) return null;
  const filename = url.slice(localMediaUrlPrefix.length);
  try {
    assertSafeFilename(filename);
  } catch {
    return null;
  }
  return filename;
}

export function localMediaPath(filename: string): string {
  assertSafeFilename(filename);
  return path.join(storageDir, filename);
}

export async function saveLocalMediaFile(filename: string, data: Buffer): Promise<string> {
  assertSafeFilename(filename);
  await mkdir(storageDir, { recursive: true });
  await writeFile(localMediaPath(filename), data);
  return `${localMediaUrlPrefix}${filename}`;
}

export async function deleteLocalMediaFile(filename: string): Promise<void> {
  assertSafeFilename(filename);
  try {
    await unlink(localMediaPath(filename));
  } catch (error) {
    // Already gone / never existed — nothing to clean up.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

/** Deletes an image/video by URL, wherever it actually lives.
    Mid-migration, a record can have some URLs already on local disk
    (this project's own /api/media/...) and some still on Supabase
    Storage (not yet moved) — callers that clean up a removed/replaced
    file shouldn't have to branch on which kind it is. */
export async function deleteMediaByUrl(
  supabase: SupabaseClient,
  url: string,
  legacyBucket: string
): Promise<void> {
  if (isLocalMediaUrl(url)) {
    const filename = filenameFromLocalMediaUrl(url);
    if (filename) await deleteLocalMediaFile(filename);
    return;
  }

  const path = url.split(`/${legacyBucket}/`)[1];
  if (path) {
    await supabase.storage.from(legacyBucket).remove([path]);
  }
}
