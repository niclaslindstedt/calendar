// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The document migration chain, run through the framework's `createMigrator`.
// `migrations[N]` upgrades a v`N` document to v`N+1`; a document with no
// numeric `version` is treated as v0.

import { createMigrator } from "@niclaslindstedt/oss-framework/storage";

import { log } from "./log.ts";
import { error as logError } from "../output.ts";
import { coerceDoc, emptyDoc, DOC_VERSION, type CalendarDoc } from "./types.ts";

export const migrator = createMigrator({
  latestVersion: DOC_VERSION,
  migrations: {
    // v0 → v1: the pre-versioning shape was a bare `{ [day]: text }` map with
    // no envelope; wrap it.
    0: (doc) => {
      const { version, entries, ...rest } = doc;
      void version; // stripped — the envelope below stamps its own
      return {
        version: 1,
        entries:
          typeof entries === "object" && entries !== null
            ? (entries as Record<string, unknown>)
            : rest,
      };
    },
  },
  logger: log,
});

/** A stored document's text, as the app's model: parsed, migrated forward and
 *  coerced. Unreadable bytes are a note in the log and an empty calendar
 *  rather than a crash — a hand-edited file, or one written by something
 *  else, must not take the app down with it. Shared by the document store and
 *  the backup reader, so both read a document the same way. */
export function parseDocument(text: string): CalendarDoc {
  try {
    return coerceDoc(migrator.migrate(JSON.parse(text)).data);
  } catch (err) {
    logError(`Stored document unreadable — starting empty (${String(err)})`);
    return emptyDoc();
  }
}
