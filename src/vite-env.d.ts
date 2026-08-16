// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/// <reference types="vite/client" />
//
// Vite's ambient client types: `import.meta.env` and the side-effecting asset
// imports (`import "./styles.css"`) both resolve through this.

// The app version, inlined by Vite's `define` (see `vite.config.ts`).
declare const __APP_VERSION__: string;

// The build identifier, composed at build time (see `vite.config.ts`):
// `<version>[.<run>][+<commit>]`.
declare const __BUILD_LABEL__: string;

// Build identity, inlined by Vite's `define` and shown in the Developer tab's
// "Build" grid: the short commit hash of the deployed source, and the CI run
// number ("dev" for a local build).
declare const __BUILD_COMMIT__: string;
declare const __BUILD_NUMBER__: string;

// Which deployment slot this build was made for — "production", "preview", or
// "branch" (see `src/app/slot.ts`) — and, for the `/branch/` slot whose URL
// never changes, the source branch parked in it. Empty otherwise.
declare const __BUILD_SLOT__: string;
declare const __BUILD_SOURCE__: string;

// Build-time env the app reads through `import.meta.env`. All optional — the
// app builds and runs with none of them set. See `docs/configuration.md`.
interface ImportMetaEnv {
  // Dropbox app key (PKCE public client). Unset hides the Dropbox storage
  // backend in Settings → Storage. See `src/app/storage/backends.ts`.
  readonly VITE_DROPBOX_APP_KEY?: string;
  // Google OAuth client id (GIS token client). Unset hides the Google Drive
  // storage backend. See `src/app/storage/backends.ts`.
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  // Dropbox app-folder name; informational (the folder is fixed by the
  // Dropbox app config). Defaults to "Calendar".
  readonly VITE_DROPBOX_APP_FOLDER?: string;
  // Google Drive folder name the app creates in My Drive. Defaults to
  // "Calendar".
  readonly VITE_GDRIVE_APP_FOLDER?: string;
}
