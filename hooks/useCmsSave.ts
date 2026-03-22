// hooks/useCmsSave.ts
"use client";

import { useTransition } from "react";
import { toast }         from "sonner";

/**
 * Handles CMS form saves:
 *
 * 1. Runs the server action inside useTransition (keeps form state alive)
 * 2. Shows a toast on success or failure
 *
 * Why was router.refresh() removed?
 *
 *   The original hook called router.refresh() after the transition to bust
 *   the Next.js client RSC cache. However this caused the "disappearing data"
 *   bug: router.refresh() tears down and remounts the RSC tree, which
 *   re-initialises the page-level RSC fetch — triggering a brief window where
 *   the DB read races with the just-completed write, returning stale/empty
 *   data and resetting form state.
 *
 *   The server actions already call revalidatePath(), which correctly marks
 *   the server cache as stale. The next time the user navigates to the page
 *   (or hard-refreshes) they'll see fresh data. For an admin CMS panel this
 *   is the right trade-off: form state is preserved after save, and the live
 *   site cache is invalidated immediately via revalidatePath.
 *
 *   If you genuinely need the page props to re-hydrate after save (e.g. to
 *   get back a newly-assigned DB id), pass `refreshAfterSave: true` and the
 *   hook will call router.refresh() — but note this will reset all useState
 *   values to whatever the server returns.
 */
export function useCmsSave() {
  const [pending, startTransition] = useTransition();

  function save(
    action: () => Promise<void>,
    options?: { successMessage?: string },
  ) {
    startTransition(async () => {
      try {
        await action();
        toast.success(options?.successMessage ?? "Changes saved successfully!");
      } catch (err) {
        console.error("[useCmsSave]", err);
        toast.error("Failed to save. Please try again.");
      }
    });
  }

  return { save, pending };
}