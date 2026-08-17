// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Keeps the `theme-color` meta on whatever the active theme actually resolves
// `--page-bg` to.
//
// The HTML shell ships a static light/dark pair (see `pwa-plugin.ts`) so the
// browser has a sensible colour before the app mounts. That pair can only ever
// be a guess: the theme is one of a dozen presets — or "follow the device", or
// a custom palette — so once the engine has painted, the real value is read
// off `<html>` and written to every `theme-color` meta in the head. Whichever
// one the browser is honouring then carries the right colour.
//
// This is what tints Chrome's toolbar and Android's task-switcher card. iOS's
// installed app is a separate story: it paints its status-bar band from the
// page canvas, which `body` claims in `src/styles.css`.

/** The value the metas carry when the page background can't be read (SSR, a
 *  stylesheet that hasn't landed): the light "paper" default. */
const FALLBACK = "#f6f8fa";

/** The resolved page background, as an authored colour string. */
function resolvedPageBg(): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--page-bg")
    .trim();
  return value === "" ? FALLBACK : value;
}

/** Point every `theme-color` meta at the resolved page background. Call after
 *  the theme engine has applied a change; a no-op outside the browser. */
export function syncThemeColor(): void {
  if (typeof document === "undefined") return;
  const color = resolvedPageBg();
  const metas = document.head.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  metas.forEach((meta) => {
    meta.content = color;
  });
}

/** Re-sync when the OS light/dark preference flips, which changes the
 *  resolved background under the "system" theme without any state of ours
 *  changing. Idempotent; returns a teardown for symmetry with the caller's
 *  effect. */
export function watchSystemThemeColor(): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => syncThemeColor();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
