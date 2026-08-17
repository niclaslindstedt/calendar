// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Puts the app shell back where it belongs after iOS moves it.
//
// The shell is exactly one viewport tall and has no scrollable overflow — the
// views scroll inside their own panes, never the document. So any document
// offset is something the engine did to us, and nothing in the app can undo
// it: it simply stays until the app is relaunched.
//
// iOS does exactly that. When the software keyboard opens, WebKit scrolls the
// page to reveal the focused field even on a page that cannot otherwise
// scroll, and undoes it when the field is blurred. If the field is *gone* by
// then — Settings → General has the "Vacation days" number input, and tapping
// Save both blurs it and unmounts the dialog in the same tick — there is
// nothing left to scroll back to, and the whole app is left riding up under
// the Dynamic Island.
//
// Two defences: the dialog blurs before it closes (so the ordinary path never
// strands an offset), and this module pins the shell back whenever the page
// has drifted and no field is focused. The focus check is what keeps it from
// fighting the keyboard: while you are typing in a day cell, iOS *should* be
// holding the cell above the keyboard.

/** Fields the keyboard belongs to. While one has focus, a drift is the engine
 *  keeping it visible — leave it alone. */
export function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el instanceof HTMLElement && el.isContentEditable;
}

/** How far the shell has been pushed off the top, from the two ways iOS can
 *  express it: a document scroll, or a visual-viewport offset. */
export function driftPx(scrollY: number, viewportOffsetTop: number): number {
  return Math.max(scrollY, viewportOffsetTop);
}

/** Whether to pin the shell back. Sub-pixel drift is rounding, not a shifted
 *  app, and a focused field owns the viewport while it has it. */
export function shouldPin(drift: number, editing: boolean): boolean {
  return !editing && drift >= 1;
}

/** Install the guard. Returns a teardown. No-op outside the browser. */
export function pinShell(): () => void {
  if (typeof window === "undefined") return () => {};

  const check = () => {
    const drift = driftPx(
      window.scrollY,
      window.visualViewport?.offsetTop ?? 0,
    );
    if (shouldPin(drift, isEditable(document.activeElement))) {
      window.scrollTo(0, 0);
    }
  };

  // A frame late, deliberately: iOS restores the offset itself in the common
  // case, and this must not race that (or land mid keyboard animation).
  let queued = 0;
  const schedule = () => {
    if (queued) return;
    queued = window.setTimeout(() => {
      queued = 0;
      check();
    }, 250);
  };

  // `focusout` covers the dialog closing over a focused field; the viewport
  // events cover the keyboard opening and closing, and rotation.
  window.addEventListener("focusout", schedule);
  window.addEventListener("orientationchange", schedule);
  window.addEventListener("pageshow", schedule);
  const vv = window.visualViewport;
  vv?.addEventListener("resize", schedule);
  vv?.addEventListener("scroll", schedule);

  return () => {
    if (queued) window.clearTimeout(queued);
    window.removeEventListener("focusout", schedule);
    window.removeEventListener("orientationchange", schedule);
    window.removeEventListener("pageshow", schedule);
    vv?.removeEventListener("resize", schedule);
    vv?.removeEventListener("scroll", schedule);
  };
}

/** Let go of the keyboard before tearing down whatever it was attached to.
 *  Called on every exit from the settings dialog. */
export function blurActiveField(): void {
  if (typeof document === "undefined") return;
  const el = document.activeElement;
  if (isEditable(el) && el instanceof HTMLElement) el.blur();
}
