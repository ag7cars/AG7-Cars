import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

// Delivery videos can be stored two ways: Supabase Storage (default,
// small free-tier limit) or directly on this server's own disk — see
// app/api/media/[filename]/route.ts for how they're served back out.
// The directory lives OUTSIDE this project's deployed code (set via
// env, e.g. a sibling folder on the Hostinger account) so a
// redeploy of the app itself can never touch previously uploaded
// files. Falls back to a local project folder in dev, where no such
// external folder exists yet.
const storageDir = process.env.VIDEO_STORAGE_DIR || path.join(process.cwd(), ".video-storage");

export const localVideoUrlPrefix = "/api/media/";

function assertSafeFilename(filename: string) {
  if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new Error("Invalid filename.");
  }
}

export function isLocalVideoUrl(url: string): boolean {
  return url.startsWith(localVideoUrlPrefix);
}

export function filenameFromLocalVideoUrl(url: string): string | null {
  if (!isLocalVideoUrl(url)) return null;
  const filename = url.slice(localVideoUrlPrefix.length);
  try {
    assertSafeFilename(filename);
  } catch {
    return null;
  }
  return filename;
}

export function videoStoragePath(filename: string): string {
  assertSafeFilename(filename);
  return path.join(storageDir, filename);
}

export async function saveVideoFile(filename: string, data: Buffer): Promise<string> {
  assertSafeFilename(filename);
  await mkdir(storageDir, { recursive: true });
  await writeFile(videoStoragePath(filename), data);
  return `${localVideoUrlPrefix}${filename}`;
}

export async function deleteVideoFile(filename: string): Promise<void> {
  assertSafeFilename(filename);
  try {
    await unlink(videoStoragePath(filename));
  } catch (error) {
    // Already gone / never existed — nothing to clean up.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
