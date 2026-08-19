// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The top menu's icon button — 36 px square, the sibling `notes` app's
// header-action size and the minimum comfortable touch target on a phone.
// Its own file rather than TopBar's because the calendar menu needs the same
// button for its trigger, and TopBar renders that menu (so importing it back
// out of TopBar would be a cycle).

import type { ReactNode, RefObject } from "react";

/** The look, on its own, for the rare caller that needs to build the element
 *  itself rather than take this component. */
export const TOP_BAR_BUTTON_CLASS =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-accent/40 bg-transparent text-accent transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-fg focus-visible:outline-none";

export function TopBarIconButton({
  label,
  onClick,
  buttonRef,
  expanded,
  children,
}: {
  label: string;
  onClick: () => void;
  /** For a button that anchors a floating panel. */
  buttonRef?: RefObject<HTMLButtonElement>;
  /** Set on a button that opens a menu — omitted entirely otherwise, so a
   *  plain action button doesn't claim to be a disclosure. */
  expanded?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      aria-haspopup={expanded === undefined ? undefined : "menu"}
      aria-expanded={expanded}
      onClick={onClick}
      className={TOP_BAR_BUTTON_CLASS}
    >
      {children}
    </button>
  );
}
