// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The holidays screen: a year's public holidays, and the vacation planner that
// turns them into the fewest booked days for the most time off.
//
// It is not a top-bar destination. A fourth segment does not fit a 393 px bar
// without demoting one of the three that are there, so the way in is tapping a
// holiday's name in any day cell — the name is already on screen, and it is
// exactly what you are asking about. Any top-bar action leaves again.
//
// The allowance the planner spends lives in Settings, so this screen is pure
// output: you read a plan here, you do not configure one.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { parseDayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  ArrowLeftIcon,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";
import { CONTENT_BOTTOM_PAD } from "./layout.ts";
import { monthName, weekdayName, type LocalePack } from "./locale/index.ts";
import { PeriodHeading } from "./PeriodHeading.tsx";
import { DECK_SCROLLER, SwipeDeck } from "./SwipeDeck.tsx";
import {
  holidaysInYear,
  planVacation,
  type VacationBreak,
} from "./vacation.ts";

export type HolidayMode = "list" | "planner";

type Props = {
  year: number;
  pack: LocalePack;
  mode: HolidayMode;
  onModeChange: (mode: HolidayMode) => void;
  /** The allowance from Settings. */
  vacationDays: number;
  onBack: () => void;
  onYearChange: (year: number) => void;
};

/** "tor 1 jan" — the compact form the list and the plan both use. */
function shortDay(pack: LocalePack, key: DayKey): string {
  const parts = parseDayKey(key);
  if (!parts) return key;
  const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
  return `${weekdayName(pack, weekday, "short")} ${parts.day} ${monthName(pack, parts.month, "short")}`;
}

/** "1–11 jan", collapsing the repeated month, or "28 dec – 3 jan" when the
 *  break crosses one. Christmas breaks always cross, so the two-month form is
 *  the common case rather than an edge. */
function rangeLabel(pack: LocalePack, start: DayKey, end: DayKey): string {
  const a = parseDayKey(start);
  const b = parseDayKey(end);
  if (!a || !b) return `${start} – ${end}`;
  const month = (m: number) => monthName(pack, m, "short");
  return a.month === b.month
    ? `${a.day}–${b.day} ${month(a.month)}`
    : `${a.day} ${month(a.month)} – ${b.day} ${month(b.month)}`;
}

/** The days to book, as bare numbers where they share a month: "2, 5, 7, 8, 9
 *  jan". Repeating the month on every one of five dates is noise. */
function bookLabel(pack: LocalePack, days: readonly DayKey[]): string {
  const parsed = days.map((d) => parseDayKey(d)).filter((p) => p !== null);
  if (parsed.length === 0) return "";
  const groups: { month: number; days: number[] }[] = [];
  for (const p of parsed) {
    const last = groups[groups.length - 1];
    if (last && last.month === p.month) last.days.push(p.day);
    else groups.push({ month: p.month, days: [p.day] });
  }
  return groups
    .map((g) => `${g.days.join(", ")} ${monthName(pack, g.month, "short")}`)
    .join(" · ");
}

export function HolidaysView({
  year,
  pack,
  mode,
  onModeChange,
  vacationDays,
  onBack,
  onYearChange,
}: Props) {
  return (
    // Years page as months do, so the gesture is the same wherever you are —
    // but only the year's own content travels. The way back, the mode switch
    // and the year heading are the same furniture in every year, so they are
    // deck chrome: sliding three copies of them past each other made the
    // screen look like it was changing more than the year.
    <SwipeDeck
      itemKey={String(year)}
      scrolls
      onPrevious={() => onYearChange(year - 1)}
      onNext={() => onYearChange(year + 1)}
      renderChrome={(nav) => (
        <HolidaysChrome
          year={year}
          mode={mode}
          onModeChange={onModeChange}
          onBack={onBack}
          onPrevious={nav.previous}
          onNext={nav.next}
        />
      )}
      renderItem={(rel) => (
        <YearPanel
          year={year + rel}
          pack={pack}
          mode={mode}
          vacationDays={vacationDays}
        />
      )}
    />
  );
}

/** The static furniture: back, the list/planner switch, and the year heading
 *  whose arrows page the deck. */
function HolidaysChrome({
  year,
  mode,
  onModeChange,
  onBack,
  onPrevious,
  onNext,
}: {
  year: number;
  mode: HolidayMode;
  onModeChange: (mode: HolidayMode) => void;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const t = useT();

  return (
    <div className="mx-auto w-full max-w-2xl px-3 sm:px-6">
      <div className="flex items-center gap-2 pt-3">
        <button
          type="button"
          aria-label={t("holidays.back")}
          onClick={onBack}
          className="text-muted hover:bg-surface-2 hover:text-fg focus-visible:ring-fg inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 justify-center">
          <SegmentedControl
            value={mode}
            onChange={(next) => onModeChange(next as HolidayMode)}
            ariaLabel={t("holidays.title")}
            options={[
              { value: "list", label: t("holidays.tabList") },
              { value: "planner", label: t("holidays.tabPlanner") },
            ]}
          />
        </div>
        {/* Balances the back button, so the switcher centres on the screen
            rather than on the space left over beside it — the same trick the
            period heading uses to keep its title between the arrows. */}
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <PeriodHeading
        title={String(year)}
        titleClass="cal-serif text-2xl tracking-wide sm:text-3xl"
        metaClass="text-lg"
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </div>
  );
}

/** One year of content — the only thing a swipe moves. */
function YearPanel({
  year,
  pack,
  mode,
  vacationDays,
}: {
  year: number;
  pack: LocalePack;
  mode: HolidayMode;
  vacationDays: number;
}) {
  return (
    // The one scrolling surface on this screen: a year of holidays does not
    // fit a phone, and unlike the calendar there is no grid to preserve.
    // `overscroll-contain` keeps a flick that runs off the end of the list
    // from bouncing the screen behind it mid-swipe.
    // `DECK_SCROLLER` puts the pane back to the top as the year changes, for
    // the same reason the day list does: the year that slides in shows January.
    <div
      {...DECK_SCROLLER}
      className="mx-auto h-full w-full max-w-2xl overflow-y-auto overscroll-contain px-3 sm:px-6"
      style={{ paddingBottom: CONTENT_BOTTOM_PAD }}
    >
      {mode === "list" ? (
        <HolidayList year={year} pack={pack} />
      ) : (
        <PlannerList year={year} pack={pack} budget={vacationDays} />
      )}
    </div>
  );
}

function HolidayList({ year, pack }: { year: number; pack: LocalePack }) {
  const t = useT();
  const holidays = holidaysInYear(pack, year);

  if (holidays.length === 0) {
    return (
      <p className="text-muted py-6 text-center text-sm">
        {t("holidays.empty")}
      </p>
    );
  }

  return (
    <ul className="border-t border-line">
      {holidays.map((h) => (
        <li
          key={`${h.key}-${h.name}`}
          className="flex items-baseline gap-3 border-b border-line py-2.5"
        >
          <span
            className={`cal-serif w-24 shrink-0 text-sm ${
              h.red ? "cal-red" : "text-muted"
            }`}
          >
            {shortDay(pack, h.key)}
          </span>
          <span
            className={`min-w-0 flex-1 text-sm ${h.red ? "cal-red" : "text-fg"}`}
          >
            {h.name}
          </span>
          {/* Named on every wall calendar but not a day off — an eve you
              work, or one your agreement shortens rather than gives back.
              Worth saying plainly, because it is the difference between a day
              you get and a day you book, and the planner will offer to spend
              an allowance day on it. A half day is a workday to the planner
              for exactly that reason: you still book a whole day to take it.
              Which eves land here is Settings → Calendar → Holiday eves. */}
          {!h.off && (
            <span className="text-muted shrink-0 text-[10px]">
              {h.eve === "half" ? t("holidays.halfDay") : t("holidays.workday")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function PlannerList({
  year,
  pack,
  budget,
}: {
  year: number;
  pack: LocalePack;
  budget: number;
}) {
  const t = useT();

  if (budget <= 0) {
    return (
      <p className="text-muted py-6 text-center text-sm">
        {t("holidays.noBudget")}
      </p>
    );
  }

  const plan = planVacation(pack, year, budget);

  if (plan.breaks.length === 0) {
    return (
      <p className="text-muted py-6 text-center text-sm">
        {t("holidays.nothingToPlan")}
      </p>
    );
  }

  return (
    <>
      {/* The headline: what the plan costs and what it returns. Both figures
          are measured off the chosen days, so two breaks sharing a weekend are
          never sold twice. */}
      <div className="border-b border-line py-3">
        <p className="cal-serif text-fg text-lg">
          {t("holidays.summary", { spent: plan.spent, off: plan.daysOff })}
        </p>
        <p className="text-muted pt-0.5 text-xs">
          {t("holidays.longest", { n: plan.longest })}
          {plan.unspent > 0 && (
            <> · {t("holidays.unspent", { n: plan.unspent })}</>
          )}
        </p>
      </div>

      <ul>
        {plan.breaks.map((b) => (
          <BreakRow key={b.start} pack={pack} vacationBreak={b} />
        ))}
      </ul>
    </>
  );
}

function BreakRow({
  pack,
  vacationBreak: b,
}: {
  pack: LocalePack;
  vacationBreak: VacationBreak;
}) {
  const t = useT();
  return (
    <li className="border-b border-line py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="cal-serif text-fg min-w-0 flex-1 text-base">
          {rangeLabel(pack, b.start, b.end)}
        </span>
        <span className="text-muted shrink-0 text-sm">
          {b.length === 1
            ? t("holidays.oneDayOff")
            : t("holidays.daysOff", { n: b.length })}
        </span>
      </div>
      <p className="text-muted pt-0.5 text-xs">
        <span className="text-fg">
          {b.cost === 1
            ? t("holidays.bookOne")
            : t("holidays.bookMany", { n: b.cost })}
        </span>
        {": "}
        {bookLabel(pack, b.days)}
      </p>
    </li>
  );
}
