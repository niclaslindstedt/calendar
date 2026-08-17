// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The heading every view shares: ‹ MONTH 2026 ›. The period arrows live here
// rather than in the top menu — on a portrait phone the menu has no room for
// them beside the view switcher, and the arrows read better flanking the
// thing they move. All three views render this, so the navigation sits in the
// same place whichever one is open.

import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";

type Props = {
  /** The period's name — the month, or "Week 34". */
  title: string;
  /** The quieter trailing detail (the year, or the week's month + year). */
  meta?: string;
  /** Typography for the title, so the month view can keep its larger,
   *  letter-spaced wall-calendar serif while the other views stay compact. */
  titleClass: string;
  /** Typography for `meta`, matched to the title's size. */
  metaClass: string;
  onPrevious: () => void;
  onNext: () => void;
};

const ARROW_CLASS =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-fg focus-visible:outline-none";

export function PeriodHeading({
  title,
  meta,
  titleClass,
  metaClass,
  onPrevious,
  onNext,
}: Props) {
  const t = useT();
  return (
    <div className="flex shrink-0 items-center gap-1 py-4">
      <button
        type="button"
        aria-label={t("topbar.previous")}
        onClick={onPrevious}
        className={ARROW_CLASS}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      <h2 className={`min-w-0 flex-1 text-center ${titleClass}`}>
        {title}
        {meta && <span className={`text-muted ml-3 ${metaClass}`}>{meta}</span>}
      </h2>

      <button
        type="button"
        aria-label={t("topbar.next")}
        onClick={onNext}
        className={ARROW_CLASS}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
