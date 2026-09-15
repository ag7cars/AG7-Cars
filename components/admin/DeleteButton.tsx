"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  endpoint,
  confirmMessage,
  redirectTo,
}: {
  endpoint: string;
  confirmMessage: string;
  /** Where to navigate after a successful delete — use this from a
      page dedicated to the deleted item itself (e.g. its edit page),
      since that page has nothing left to refresh into. Omit it from
      a list page, where refreshing in place is what you want. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return;

    setPending(true);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to delete.");
      }

      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete.");
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-400/30 px-3 text-xs font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
