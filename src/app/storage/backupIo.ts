// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The browser half of import / export: reading every calendar's document out
// of the active backend, and writing the merged ones back. The *rules* — what
// a backup carries, what an import means — are `backup.ts`, which is pure and
// tested; this file is only the round-trip through the adapters.
//
// Both directions run through the same adapters the document store uses, one
// per calendar (`buildAdapter(backend, slug)`), with the same fallback: a
// backend that isn't connected reads and writes the browser's own copy rather
// than failing, exactly as the store falls back on boot.

import { describeStorageError } from "@niclaslindstedt/oss-framework/storage";

import { parseDocument } from "../migrations.ts";
import { error as logError } from "../../output.ts";
import { emptyDoc, serializeDoc, type CalendarDoc } from "../types.ts";
import { buildAdapter, type BackendId } from "./backends.ts";

/** Read every listed calendar's document. Throws on the first one that can't
 *  be read: a backup missing a calendar's notes looks complete and isn't, so
 *  the export has to fail loudly instead. */
export async function readCalendarDocuments(
  backend: BackendId,
  slugs: readonly string[],
): Promise<Record<string, CalendarDoc>> {
  const documents: Record<string, CalendarDoc> = {};
  for (const slug of slugs) {
    const adapter =
      (await buildAdapter(backend, slug)) ??
      (await buildAdapter("browser", slug));
    if (!adapter) {
      documents[slug] = emptyDoc();
      continue;
    }
    try {
      const snapshot = await adapter.load();
      documents[slug] = snapshot ? parseDocument(snapshot.text) : emptyDoc();
    } catch (err) {
      const message = describeStorageError(err);
      logError(`Could not read “${slug}” for the backup: ${message}`);
      throw new Error(message, { cause: err });
    }
  }
  return documents;
}

/** Write the merged documents back, skipping `skipSlug` — the calendar on
 *  screen is written through the live store instead, so the revision it holds
 *  stays current and the reader sees the merge without a reload.
 *
 *  Best-effort per calendar: one backend hiccup must not strand the rest of
 *  the import half-applied and unreported, so the slugs that failed come back
 *  for the dialog to name. */
export async function writeCalendarDocuments(
  backend: BackendId,
  documents: Readonly<Record<string, CalendarDoc>>,
  skipSlug?: string,
): Promise<string[]> {
  const failed: string[] = [];
  for (const [slug, doc] of Object.entries(documents)) {
    if (slug === skipSlug) continue;
    try {
      const adapter =
        (await buildAdapter(backend, slug)) ??
        (await buildAdapter("browser", slug));
      if (!adapter) throw new Error("no backend");
      // No base revision: the merge already carries whatever was there — it
      // was read a moment ago — and a conflict check here would only refuse
      // the write the reader has just asked for.
      await adapter.save(serializeDoc(doc));
    } catch (err) {
      const message = describeStorageError(err);
      logError(`Could not write “${slug}” from the import: ${message}`);
      failed.push(slug);
    }
  }
  return failed;
}
