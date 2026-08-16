// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The top menu — the app's only chrome (no sidebar): month navigation on the
// left, the view switcher in the middle, and the settings cogwheel top right.

import {
  Button,
  ChevronLeftIcon,
  ChevronRightIcon,
  CogIcon,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";
import type { ViewMode } from "./useAppSettings.ts";

type Props = {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenSettings: () => void;
};

export function TopBar({
  view,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onOpenSettings,
}: Props) {
  const t = useT();
  return (
    <header
      className="flex items-center gap-2 border-b border-line bg-surface px-2 py-1.5 sm:px-4"
      style={{ paddingTop: "calc(0.375rem + env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          aria-label={t("topbar.previous")}
          onClick={onPrevious}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={onToday}>
          {t("topbar.today")}
        </Button>
        <Button variant="ghost" aria-label={t("topbar.next")} onClick={onNext}>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-w-0 flex-1 text-center">
        <SegmentedControl
          value={view}
          onChange={onViewChange}
          ariaLabel={t("topbar.viewMonth")}
          options={[
            { value: "month", label: t("topbar.viewMonth") },
            { value: "week", label: t("topbar.viewWeek") },
            { value: "list", label: t("topbar.viewList") },
          ]}
        />
      </div>

      <Button
        variant="ghost"
        aria-label={t("topbar.settings")}
        onClick={onOpenSettings}
      >
        <CogIcon className="h-5 w-5" />
      </Button>
    </header>
  );
}
