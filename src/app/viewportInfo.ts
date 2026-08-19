// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// What the device says about the screen the app is drawn on — the numbers a
// portrait-mobile layout bug is argued from.
//
// This exists because the bottom gutter has now been wrong twice on an
// installed iOS PWA and both times the argument was about a number nobody
// could read: whether `env(safe-area-inset-bottom)` reports the home
// indicator's band or reports nothing. `src/styles.css` no longer trusts it
// (see `--cal-bottom-gutter`), and Settings → Developer → Device prints what
// the device actually said, so the next such report comes with evidence
// rather than a guess.
//
// The insets can only be read by asking the engine to resolve them somewhere:
// `env()` is a CSS value, not a property, so a throwaway element takes them as
// padding and `getComputedStyle` reads them back.

/** The four safe-area insets, in CSS pixels. */
export type Insets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** The device geometry the Developer tab prints. */
export type ViewportInfo = {
  width: number;
  height: number;
  insets: Insets;
  /** The resolved `--cal-bottom-gutter`, i.e. the gap a view's last row is
   *  actually getting on this device. */
  bottomGutter: string;
  /** The space above the top menu's buttons, as `safeArea.ts` resolved it. */
  topbarLead: string;
  /** `standalone` in an installed PWA, `browser` in a tab. */
  displayMode: string;
};

/** The padding shorthand a probe element carries so the engine resolves all
 *  four insets onto one element. */
export const INSET_PROBE_PADDING =
  "env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)";

/** `"12.5px"` → `12.5`; anything unparseable → `0`. A computed padding is
 *  always in px, but a browser that resolved nothing hands back `""`. */
export function pxOf(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** The insets as one line: top / right / bottom / left, the CSS order, with
 *  whole pixels — the fractional part of an inset is never the story. */
export function formatInsets(insets: Insets): string {
  return [insets.top, insets.right, insets.bottom, insets.left]
    .map((n) => Math.round(n))
    .join(" / ");
}

/** `393 × 852`. */
export function formatSize(width: number, height: number): string {
  return `${Math.round(width)} × ${Math.round(height)}`;
}

/** Which display mode the app is running in. Only the two that change the
 *  layout are named; anything else is reported verbatim so an unexpected one
 *  (`minimal-ui`, `fullscreen`) is visible rather than mislabelled. */
export function displayModeOf(
  matches: (query: string) => boolean,
  modes: readonly string[] = [
    "standalone",
    "fullscreen",
    "minimal-ui",
    "browser",
  ],
): string {
  for (const mode of modes) {
    if (matches(`(display-mode: ${mode})`)) return mode;
  }
  return "unknown";
}

/** Read the four safe-area insets off the live document.
 *
 *  `env()` is a value, not a property, so a throwaway element takes them as
 *  padding — the one form of `env()` every engine has always computed, which
 *  is why `src/app/safeArea.ts` resolves the chrome's geometry through this
 *  rather than in the stylesheet. */
export function readInsets(): Insets {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;top:0;left:0;width:0;height:0;box-sizing:content-box;visibility:hidden;pointer-events:none;padding:${INSET_PROBE_PADDING}`;
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets: Insets = {
    top: pxOf(style.paddingTop),
    right: pxOf(style.paddingRight),
    bottom: pxOf(style.paddingBottom),
    left: pxOf(style.paddingLeft),
  };
  probe.remove();
  return insets;
}

/** Measure the live document. Returns `null` outside the browser. */
export function readViewportInfo(): ViewportInfo | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  // The gutter is *resolved* rather than read off `:root`: a custom property
  // hands back whatever it was written as, and on this device that is either
  // a `calc()` or the plain pixel length `safeArea.ts` published — neither of
  // which is the question. The height of a throwaway element set to it is.
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:var(--cal-bottom-gutter)`;
  document.body.appendChild(probe);
  const bottomGutter = `${Math.round(pxOf(getComputedStyle(probe).height))}px`;
  probe.remove();

  // The top menu's leading space, the other half of the same story — the two
  // numbers a chrome bug report is argued from.
  const topbarLead = `${Math.round(
    pxOf(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--cal-topbar-lead",
      ),
    ),
  )}px`;

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    insets: readInsets(),
    bottomGutter,
    topbarLead,
    displayMode: displayModeOf((q) => window.matchMedia(q).matches),
  };
}
