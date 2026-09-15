// Delivery videos can either be an uploaded file (stored in Supabase
// Storage, capped at whatever the bucket's free-tier limit allows) or
// a YouTube link (stored as plain text in the same `media_url`
// column, no file ever touches Supabase Storage) — this is how large
// videos stay usable on the free Supabase plan. These helpers detect
// which kind a given URL is and extract the video ID for embedding.

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

/** Extracts the 11-character video ID from any common YouTube URL
    shape (watch, youtu.be, shorts, embed), or null if it isn't one. */
export function getYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  if (parsed.hostname.toLowerCase().includes("youtu.be")) {
    const id = parsed.pathname.slice(1).split("/")[0];
    return id || null;
  }

  const watchId = parsed.searchParams.get("v");
  if (watchId) return watchId;

  const pathMatch = parsed.pathname.match(/^\/(shorts|embed)\/([^/]+)/);
  if (pathMatch) return pathMatch[2];

  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null;
}

/** Canonical watch URL — stored in the DB regardless of which shape
    the admin originally pasted, so every other reader only has to
    handle one format. */
export function toCanonicalYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function toYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function toYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
