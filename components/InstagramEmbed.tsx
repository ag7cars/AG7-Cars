"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: {
      Embeds: { process: () => void };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadInstagramEmbedScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.instgrm) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="instagram.com/embed.js"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

// Renders Instagram's own official embed widget (profile header, the
// post/reel itself, like/comment footer — Instagram's full branded
// card, not a stripped-down player; see lib/instagram.ts for why a
// delivery video might be hosted this way). embed.js only auto-scans
// the page once on its own load, so anything mounted after that
// (client-side navigation, a new carousel card) needs Embeds.process()
// called again manually — that's what this effect does.
export default function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    let cancelled = false;

    loadInstagramEmbedScript().then(() => {
      if (!cancelled) window.instgrm?.Embeds.process();
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="flex w-full justify-center bg-white">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ background: "#FFF", border: 0, margin: 0, maxWidth: 540, width: "100%" }}
      >
        <a href={url} target="_blank" rel="noreferrer" />
      </blockquote>
    </div>
  );
}
