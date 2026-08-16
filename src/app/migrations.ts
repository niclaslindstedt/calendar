// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The document migration chain, run through the framework's `createMigrator`.
// `migrations[N]` upgrades a v`N` document to v`N+1`; a document with no
// numeric `version` is treated as v0.

import { createMigrator } from "@niclaslindstedt/oss-framework/storage";

import { log } from "./log.ts";
import { DOC_VERSION } from "./types.ts";

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
