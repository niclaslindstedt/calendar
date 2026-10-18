// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
//
// Whether this is the phone app's build (`native/scripts/web-build-env.mjs`
// sets `VITE_NATIVE_BUILD=on`). Read through `import.meta.env`, so Vite folds
// it to a constant and the phone bundle drops what is gated on it rather than
// hiding it; a test stubs the variable and imports the module afresh.
//
// What the phone app leaves out or says differently hangs off this one flag:
// the storage it does not offer (`storage/backends.ts`), and the on-device
// backend's name in the catalogs — "This device" there, since the page runs
// inside the app and no browser is in sight; "This browser" everywhere else.
export const PHONE_BUILD = import.meta.env.VITE_NATIVE_BUILD === "on";
