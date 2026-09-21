"use client";

import { useState } from "react";

type MigrationEntry = {
  table: string;
  id: string;
  field: string;
  from: string;
  to?: string;
  error?: string;
};

type CheckResult = {
  remainingOnSupabase: number;
  remaining: { table: string; id: string; url: string }[];
  supabaseCleanupPaths: string[];
};

type MigrateResult = {
  migrated: number;
  failed: number;
  details: MigrationEntry[];
};

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Unexpected response (${response.status}): ${text.slice(0, 200)}` };
  }
}

export default function MigrateMediaPanel() {
  const [busy, setBusy] = useState<"check" | "migrate" | "cleanup" | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [migrateResult, setMigrateResult] = useState<MigrateResult | null>(null);
  const [message, setMessage] = useState("");

  async function runCheck() {
    setBusy("check");
    setMessage("");
    try {
      const response = await fetch("/api/admin/migrate-media");
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data?.error ?? "Check failed.");
      setCheckResult(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function runMigrate() {
    if (
      !window.confirm(
        "This downloads every photo/video still on Supabase Storage and saves a copy on this server, then updates the database to point at the new copy. It needs Supabase Storage to actually be reachable right now. Continue?"
      )
    ) {
      return;
    }

    setBusy("migrate");
    setMessage("");
    try {
      const response = await fetch("/api/admin/migrate-media", { method: "POST" });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data?.error ?? "Migration failed.");
      setMigrateResult(data);
      setMessage(`Migrated ${data.migrated} file(s), ${data.failed} failed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function runCleanup() {
    if (!checkResult || checkResult.supabaseCleanupPaths.length === 0) {
      setMessage("Run \"Check what's still on Supabase\" first, after migrating, to build the cleanup list.");
      return;
    }

    if (
      !window.confirm(
        `This permanently deletes ${checkResult.supabaseCleanupPaths.length} file(s) from Supabase Storage. Only do this after confirming the site looks right with the migrated copies. This cannot be undone. Continue?`
      )
    ) {
      return;
    }

    setBusy("cleanup");
    setMessage("");
    try {
      const response = await fetch("/api/admin/migrate-media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: checkResult.supabaseCleanupPaths }),
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data?.error ?? "Cleanup failed.");
      setMessage(`Deleted ${data.deleted} file(s) from Supabase Storage.`);
      setCheckResult(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={runCheck}
          disabled={busy !== null}
          className="h-11 rounded-xl border border-white/15 px-5 text-sm font-semibold text-white transition hover:border-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "check" ? "Checking…" : "1. Check what's still on Supabase"}
        </button>

        <button
          type="button"
          onClick={runMigrate}
          disabled={busy !== null}
          className="h-11 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "migrate" ? "Migrating…" : "2. Migrate to this server"}
        </button>

        <button
          type="button"
          onClick={runCleanup}
          disabled={busy !== null || !checkResult?.supabaseCleanupPaths.length}
          className="h-11 rounded-xl border border-rose-400/30 px-5 text-sm font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "cleanup" ? "Deleting…" : "3. Delete originals from Supabase"}
        </button>
      </div>

      {message && <p className="text-sm text-white/70">{message}</p>}

      {checkResult && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">
            {checkResult.remainingOnSupabase} file(s) still on Supabase Storage
          </p>
          {checkResult.remaining.length > 0 && (
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-xs text-white/50">
              {checkResult.remaining.map((item, index) => (
                <li key={index} className="truncate">
                  {item.table} · {item.id} — {item.url}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {migrateResult && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">
            {migrateResult.migrated} migrated, {migrateResult.failed} failed
          </p>
          {migrateResult.details.length > 0 && (
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-xs">
              {migrateResult.details.map((entry, index) => (
                <li key={index} className={entry.error ? "text-rose-300" : "text-emerald-300"}>
                  {entry.table} · {entry.id}: {entry.error ?? "OK"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
