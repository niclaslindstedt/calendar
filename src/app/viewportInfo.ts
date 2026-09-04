// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// What the device says about the screen the app is drawn on — the numbers a
// portrait-mobile layout bug is argued from.
//
// This exists because the bottom gutter has now been wrong twice on an
// installed iOS PWA and both times the argument was about a number nobody
// could read: whether `env(safe-area-inset-bottom)` reports the home
// indicator's band or reports nothing. `src/styles.css` no longer trusts it
// (see `--cal-bottom-gutter`), and Settings → Developer → Device prints what
// the device actually said, so the next such report comes with evidence rather
// than a guess.
//
// The generic half — probing the insets, resolving a CSS length, naming the
// display mode — is the framework's (`pwa/viewport`). What is left here is the
// pair of lengths that are *this app's* chrome: the space above the top menu's
// buttons, and the gap under a view's last row.

import {
  displayModeOf,
  formatInsets,
  readSafeAreaInsets,
  resolveCssLength,
  type SafeAreaInsets,
} from "@niclaslindstedt/oss-framework/pwa";

export type { SafeAreaInsets };
export { formatInsets };

/** The device geometry the Developer tab prints. */
export type ViewportInfo = {
  width: number;
  height: number;
  insets: SafeAreaInsets;
  /** The resolved `--cal-bottom-gutter`, i.e. the gap a view's last row is
   *  actually getting on this device. */
  bottomGutter: string;
  /** The space above the top menu's buttons, as the stylesheet resolved it. */
  topbarLead: string;
  /** `standalone` in an installed PWA, `browser` in a tab. */
  displayMode: string;
};

/** `393 × 852`. */
export function formatSize(width: number, height: number): string {
  return `${Math.round(width)} × ${Math.round(height)}`;
}

/** Measure the live document. Returns `null` outside the browser. */
export function readViewportInfo(): ViewportInfo | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  // The gutter is *resolved* rather than read off `:root`: a custom property
  // hands back whatever it was written as, which here is a `calc()` over an
  // `env()` — not the question. The height of a throwaway element set to it
  // is.
  const bottomGutter = `${Math.round(resolveCssLength("var(--cal-bottom-gutter)"))}px`;

  // The top menu's leading space, the other half of the same story — the two
  // numbers a chrome bug report is argued from. Read off the bar the app is
  // actually wearing rather than off a variable: which rule won is the whole
  // question (a browser tab and an installed app get different ones), and a
  // used `padding-top` is the only answer that cannot be argued with. `0px`
  // where the bar is not mounted, which the Developer tab never is.
  const bar = document.querySelector(".cal-topbar");
  const topbarLead = `${Math.round(
    bar ? parseFloat(getComputedStyle(bar).paddingTop) || 0 : 0,
  )}px`;

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    insets: readSafeAreaInsets(),
    bottomGutter,
    topbarLead,
    displayMode: displayModeOf((q) => window.matchMedia(q).matches),
  };
}
