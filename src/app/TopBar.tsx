// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The top menu — the app's only chrome (no sidebar): "Today" on the left, the
// view switcher in the middle, and the settings cogwheel top right. Period
// navigation is deliberately NOT here: the ‹ › arrows sit on the month
// heading (`PeriodHeading`), which is where the eye already is and which
// leaves the switcher room to breathe on a portrait phone.
//
// The bar follows the sibling `notes` app's header: page-background with a
// blur, one hairline underneath, `px-4 py-3`, and 36 px square icon buttons.
// The one deviation is the top inset — see `HEADER_PAD` below.

import type { ReactNode } from "react";

import {
  CogIcon,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";
import type { ViewMode } from "./useAppSettings.ts";

/** The bar's breathing room, in the `py-3` Tailwind step. The top padding
 *  *adds* to the safe-area inset rather than absorbing it (notes takes the
 *  `max()` of the two), so on a notched phone the gap between the status-bar
 *  island and the buttons matches the gap from the buttons down to the
 *  hairline — the bar reads centred instead of top-heavy. */
const HEADER_PAD = "0.75rem";

/** A 36 px square icon button, the sibling app's header-action look. */
export function TopBarIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-accent/40 bg-transparent text-accent transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-fg focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

type Props = {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onToday: () => void;
  onOpenSettings: () => void;
};

export function TopBar({ view, onViewChange, onToday, onOpenSettings }: Props) {
  const t = useT();
  return (
    <header
      className="flex items-center gap-2 border-b border-line bg-page-bg/90 px-4 py-3 backdrop-blur"
      style={{
        paddingTop: `calc(${HEADER_PAD} + env(safe-area-inset-top))`,
        paddingBottom: HEADER_PAD,
      }}
    >
      <button
        type="button"
        onClick={onToday}
        className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-[var(--radius)] border border-accent/40 bg-transparent px-3 text-sm text-accent transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-fg focus-visible:outline-none"
      >
        {t("topbar.today")}
      </button>

      <div className="flex min-w-0 flex-1 justify-center">
        <SegmentedControl
          value={view}
          onChange={onViewChange}
          ariaLabel={t("topbar.viewSwitcher")}
          className="whitespace-nowrap"
          options={[
            { value: "month", label: t("topbar.viewMonth") },
            { value: "week", label: t("topbar.viewWeek") },
            { value: "list", label: t("topbar.viewList") },
          ]}
        />
      </div>

      <TopBarIconButton label={t("topbar.settings")} onClick={onOpenSettings}>
        <CogIcon className="h-[18px] w-[18px]" />
      </TopBarIconButton>
    </header>
  );
}
