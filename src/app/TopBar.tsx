// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The top menu — the app's only chrome (no sidebar): the calendar switcher
// on the left, the view switcher in the middle, and the settings cogwheel top
// right. Period navigation is deliberately NOT here: the ‹ › arrows sit on
// the month heading (`PeriodHeading`), which is where the eye already is and
// which leaves the switcher room to breathe on a portrait phone.
//
// Going back to today is not a button either. Every press of the switcher
// returns to today, whether it lands on the view you are already in or moves
// you to another one — the gesture a segmented control invites anyway (a tab
// bar that re-selects its own tab scrolls to the top), and the only way to fit
// a calendar switcher into a three-slot bar without a fourth control that
// wraps in portrait.
//
// The bar follows the sibling `notes` app's header: page-background with a
// blur, one hairline underneath, `px-4 py-3`, and 36 px square icon buttons.
// The one deviation is the top inset, which has to differ between an
// installed iOS PWA and everything else — so the vertical padding lives in
// `.cal-topbar` (`src/styles.css`) rather than in utilities here.

import {
  CogIcon,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";
import { CalendarMenu } from "./CalendarMenu.tsx";
import { TopBarIconButton } from "./TopBarButton.tsx";
import { useT } from "./i18n/index.ts";
import type { ViewMode } from "./useAppSettings.ts";
import type { Calendar } from "./useCalendars.ts";

type Props = {
  view: ViewMode;
  /** Called for every press of the switcher — including a press on the view
   *  that is already showing. Every one of them also puts the calendar back at
   *  today; the shell owns that decision (`App.tsx`), not this bar. */
  onViewChange: (view: ViewMode) => void;
  calendars: Calendar[];
  activeCalendar: string;
  onSwitchCalendar: (slug: string) => void;
  onManageCalendars: () => void;
  onOpenSettings: () => void;
};

export function TopBar({
  view,
  onViewChange,
  calendars,
  activeCalendar,
  onSwitchCalendar,
  onManageCalendars,
  onOpenSettings,
}: Props) {
  const t = useT();
  return (
    <header className="cal-topbar flex items-center gap-2 border-b border-line bg-page-bg/90 px-4 backdrop-blur">
      <CalendarMenu
        calendars={calendars}
        activeSlug={activeCalendar}
        onSwitch={onSwitchCalendar}
        onManage={onManageCalendars}
      />

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
