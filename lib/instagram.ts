// Same idea as lib/youtube.ts — a delivery video can be an Instagram
// post/reel link instead of an uploaded file or YouTube link, stored
// as plain text in media_url with no file touching Supabase Storage.

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

/** True for any instagram.com post/reel/tv URL (query params and all —
    the "copy link" share button always appends tracking params like
    ?utm_source=...&stkn=..., which this ignores). */
export function isInstagramUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!INSTAGRAM_HOSTS.has(parsed.hostname.toLowerCase())) return false;
  return /^\/(p|reel|tv)\/[^/]+\/?$/.test(parsed.pathname);
}

/** Strips tracking query params down to the bare permalink Instagram's
    own embed widget expects (e.g. ".../reel/DQtJ4QvjDq2/"). */
export function toCanonicalInstagramUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!INSTAGRAM_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  const match = parsed.pathname.match(/^\/(p|reel|tv)\/([^/]+)\/?$/);
  if (!match) return null;

  return `https://www.instagram.com/${match[1]}/${match[2]}/`;
}
