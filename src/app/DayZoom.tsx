// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The day, held up close. A long press on any day in any of the three views
// opens it (`useLongPress`, the framework's); the way out is the ✕, Escape, or
// a tap on the page behind.
//
// The problem it solves is the one every printed calendar has: a month cell is
// 47 px wide on a phone, so a note longer than a few words is set at 8 px and
// then clamped to an ellipsis (`entryFit.ts`). The cell is right to do that —
// it is a square on a grid of thirty — but the text is still yours, and there
// was no way to read the rest of it, let alone write it comfortably. So the
// zoom is the same day printed as a *page*: the date and the almanac's
// captions at the head, and under them the whole note at roughly four times
// the size a cell could hold it at (`ZOOM_NOTE_FONT`), wrapping properly and
// scrolling if it runs past the card.
//
// It is a page rather than a magnified cell, deliberately. The obvious reading
// of "zoom" is to redraw the cell at four times its size, and it does not
// survive contact with the other two views: a strip row is a *line* the width
// of the screen, and four times a line is a line that no longer fits. What all
// three views have in common is the day itself — a date, its weekday, its
// week, its holiday, its names and what you wrote — so that is what is
// enlarged, in the faces and size steps of the view you were looking at
// (`viewStyle.ts`) so it still reads as your calendar.
//
// Writing happens here too: the note is the same `DayEntry` the cell mounts,
// unbounded, so the card is the comfortable end of the surface you already
// type on. That is also the one place the zoom can outgrow its cell — a cell
// refuses the keystroke that would overflow it, and this page does not — which
// is the trade the whole feature is asking for: the calendar shows what fits
// and ends in an ellipsis, and the day itself keeps the rest.

import { useEffect, useState, type CSSProperties } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { parseDayKey } from "@niclaslindstedt/oss-framework/calendar";
import { CloseIcon, Modal } from "@niclaslindstedt/oss-framework/components";

import { DayEntry } from "./DayEntry.tsx";
import { ZOOM_NOTE_FONT, type EntryTextSize } from "./entryFont.ts";
import { useT } from "./i18n/index.ts";
import {
  holidayFor,
  isRedDay,
  nameDaysFor,
  weekNumber,
  weekdayName,
  type LocalePack,
} from "./locale/index.ts";
import { NameDayNames } from "./NameDayNames.tsx";
import { SCOPE_CLASS, SCOPE_OF_VIEW, type StyleView } from "./viewStyle.ts";

type Props = {
  /** The day on display, or `null` when the zoom is closed. */
  day: DayKey | null;
  /** The view it was opened from — the card is set in that view's faces and
   *  size steps, so zooming out of the month grid and out of the day list
   *  give you your own two calendars rather than one generic dialog. */
  view: StyleView;
  pack: LocalePack;
  showWeekNumbers: boolean;
  showNameDays: boolean;
  /** The heading band's colour, which the week number is printed in — the
   *  same ink the strip's margin uses, for the same reason. */
  headerInk: string | null;
  /** How the reader has the note's size set, in the scope this came from. */
  textSize: EntryTextSize;
  /** What is written on the day. */
  text: string;
  onCommit: (day: DayKey, text: string) => void;
  onClose: () => void;
  /** Tapping the holiday's name leaves for the holidays screen, as it does
   *  everywhere else the name is printed. */
  onOpenHolidays: (year: number) => void;
  /** …and one of the day's names for the name-day search. */
  onOpenNames: (name: string) => void;
};

export function DayZoom({
  day,
  view,
  pack,
  showWeekNumbers,
  showNameDays,
  headerInk,
  textSize,
  text,
  onCommit,
  onClose,
  onOpenHolidays,
  onOpenNames,
}: Props) {
  const t = useT();
  // Whether the caret is in the note. The card opens as a page to read — the
  // long press was a request to *see* the day — and one tap on the note turns
  // it into one to write on, which is the same gesture the cell behind it
  // answers to.
  const [editing, setEditing] = useState(false);
  useEffect(() => setEditing(false), [day]);

  const parts = day ? parseDayKey(day) : null;
  if (!day || !parts) return null;

  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const holiday = holidayFor(pack, parts.year, parts.month, parts.day);
  const red = isRedDay(pack, parts.year, parts.month, parts.day, weekday);
  const names = showNameDays ? nameDaysFor(pack, parts.month, parts.day) : [];
  const week = weekNumber(pack, day);

  return (
    <Modal
      open
      onClose={onClose}
      centered
      size="max-w-md"
      labelledBy="day-zoom-title"
      closeLabel={t("zoom.close")}
    >
      {/* The card carries the scope class of the view it was opened from, so
          every `.cal-font-*` / `.cal-size-*` inside it resolves to that view's
          settings — and pins the room factor to 1, for the reason the settings
          samples do (`viewSample.tsx`): the factor says how much bigger the
          *calendar* is set on this screen than on the phone it was measured
          on, and this is a card in a dialog, already drawn at its own bases. */}
      <div
        className={`${SCOPE_CLASS[SCOPE_OF_VIEW[view]]} flex min-h-0 flex-1 flex-col`}
        style={{ "--cal-room": "1" } as CSSProperties}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-line px-4 pt-3 pb-2">
          <div className="min-w-0 flex-1">
            <h2 id="day-zoom-title" className="flex items-baseline gap-2">
              <span
                className={`cal-font-day cal-size-day leading-none [--cal-base:2.5rem] ${
                  red ? "cal-red" : "text-fg"
                }`}
              >
                {parts.day}
              </span>
              <span
                className={`cal-serif text-lg ${red ? "cal-red" : "text-muted"}`}
              >
                {weekdayName(pack, weekday)}
              </span>
            </h2>

            {/* The almanac's two captions, at a size that is a caption on a
                card rather than in a 47 px column — and still the way into the
                two screens they open, exactly as they are in the calendar. */}
            {holiday && (
              <p
                role="button"
                tabIndex={0}
                onClick={() => onOpenHolidays(parts.year)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  onOpenHolidays(parts.year);
                }}
                className={`cal-font-holiday cal-size-holiday mt-1 cursor-pointer leading-snug [--cal-base:0.9375rem] focus-visible:outline-2 ${
                  holiday.red ? "cal-red" : "text-muted"
                }`}
              >
                {holiday.name}
              </p>
            )}
            {names.length > 0 && (
              <p className="cal-font-nameday cal-size-nameday text-muted mt-0.5 leading-snug [--cal-base:0.9375rem]">
                <NameDayNames names={names} pack={pack} onOpen={onOpenNames} />
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={onClose}
              aria-label={t("zoom.close")}
              className="text-muted hover:bg-surface-2 hover:text-fg -mt-1 -mr-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded focus-visible:outline-2"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {showWeekNumbers && (
              <span
                className={`cal-font-week cal-size-week leading-none italic [--cal-base:0.9375rem] ${
                  headerInk ? "" : "text-muted"
                }`}
                style={headerInk ? { color: headerInk } : undefined}
              >
                {t("topbar.week", { n: week })}
              </span>
            )}
          </div>
        </header>

        {/* The page itself. It scrolls rather than clips: the zoom is where a
            note that outgrew its cell is supposed to be readable, so there is
            no second ceiling here — and it is a tap target at full height, so
            an empty day is a blank page with a caret waiting, the way an empty
            cell is. */}
        <div
          role="button"
          tabIndex={0}
          aria-label={t("zoom.write")}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || editing) return;
            e.preventDefault();
            setEditing(true);
          }}
          className="min-h-[8rem] flex-1 cursor-text overflow-y-auto overscroll-contain px-4 py-3 focus-visible:outline-2"
        >
          <DayEntry
            text={text}
            editing={editing}
            font={ZOOM_NOTE_FONT}
            size={textSize}
            // The card is the one surface with no box to measure against: it
            // grows with the note and scrolls, which is the whole point of
            // having been opened.
            bounded={false}
            onCommit={(next) => onCommit(day, next)}
            onClose={() => setEditing(false)}
          />
        </div>
      </div>
    </Modal>
  );
}
