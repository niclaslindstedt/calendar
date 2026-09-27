// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The demo calendars: one person's year, written for the store screenshots
// and the live demo (`make demo`, `VITE_SEED=demo` — see `./demo.ts`), and
// the sample Settings → Developer → Demo data shows.
//
// The person is a platform engineer: on call one week in four, giving their
// first conference talk next week, climbing on Thursdays, building the Sunday
// long run up to a half marathon, keeping a small homelab alive. Friends and
// family go by first name.
//
// Every note is placed by (weeks from this week, weekday) from the moment the
// demo opens, so whatever day it is, the month on screen is full and this
// week is the busy one. Notes are written for a phone's month cell: a few
// short words, none longer than seven letters (a longer word breaks mid-word
// in a ~55 px cell). The one long note is the talk day, which is what the day
// page is for.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { addDays, dayKeyOf } from "@niclaslindstedt/oss-framework/calendar";

import { DEFAULT_CALENDAR_SLUG } from "../storage/paths.ts";
import { DOC_VERSION, type CalendarDoc } from "../types.ts";

/** Weekdays, Monday first. The notes are placed on Monday-to-Sunday weeks
 *  whatever the country; a Sunday-start calendar (the US pack) shows this
 *  week as the Sunday before it and Monday to Saturday, so that Sunday is
 *  written to belong to the busy week too. */
const MON = 0;
const TUE = 1;
const WED = 2;
const THU = 3;
const FRI = 4;
const SAT = 5;
const SUN = 6;

/** One note: weeks from the week `now` is in, the weekday, the text. */
type Placed = readonly [week: number, weekday: number, text: string];

/** The talk day's page: the one note written to be read held open. */
export const TALK_NOTE = [
  "My talk 11:40 🎤",
  "Room B, in by 11",
  "Clicker + the USB-C dongle",
  "Slides on a thumb drive too",
  "Speakers' dinner 7pm",
].join("\n");

/** Where the talk is: next week's Thursday. */
export const TALK_AT = { week: 1, weekday: THU } as const;

const PERSONAL: readonly Placed[] = [
  // Six weeks ago: the call for talks, the first long runs.
  [-6, TUE, "Dentist 8:30"],
  [-6, THU, "Climb 7pm"],
  [-6, FRI, "Pizza night"],
  [-6, SAT, "Repair café 10am"],
  [-6, SUN, "Long run 8k"],
  [-5, WED, "CFP closes!"],
  [-5, THU, "Boulder w/ Leo"],
  [-5, SAT, "Mom's 60th 🎂"],
  [-5, SUN, "Lazy day"],
  [-4, MON, "On-call 📟"],
  [-4, WED, "Trivia night"],
  [-4, THU, "Climb 7pm"],
  [-4, FRI, "3am page 😴"],
  [-4, SUN, "Long run 10k"],
  [-3, MON, "Hand off on-call"],
  [-3, TUE, "Talk is in! 🎉"],
  [-3, THU, "Lead climb"],
  [-3, SAT, "Fix bike brakes"],
  [-3, SUN, "Call Mom"],
  [-2, TUE, "Book train"],
  [-2, WED, "Outline talk"],
  [-2, THU, "Climb 7pm"],
  [-2, FRI, "Board games at Ana's"],
  [-2, SUN, "Long run 12k"],
  [-1, MON, "Haircut 9am"],
  [-1, WED, "Slides v1"],
  [-1, THU, "Climb: the 6c!"],
  [-1, SAT, "Feed the starter"],
  [-1, SUN, "Bake bread 🍞\nfor the week"],
  // This week: the busy one, and the week planner's frame — a headline and
  // a second line, which the planner's rows have room for.
  [0, MON, "On-call 📟\ntill Mon"],
  [0, TUE, "Dry run 4pm\nw/ Priya"],
  [0, WED, "Release 2.4\nthen cake"],
  [0, THU, "Climb 7pm\nnew shoes!"],
  [0, FRI, "No deploys\nafter 3pm"],
  [0, SAT, "Swap NAS disk\nscrub first"],
  [0, SUN, "Long run 14k\nslow pace"],
  // Next week: the talk.
  [1, MON, "Hand off on-call"],
  [1, TUE, "Slides freeze"],
  [1, WED, "Train 8:05"],
  [TALK_AT.week, TALK_AT.weekday, TALK_NOTE],
  [1, FRI, "Conf day 2"],
  [1, SAT, "Home. Sleep."],
  // After it: the race, a cabin, a keyboard.
  [2, TUE, "Write up talk"],
  [2, THU, "Climb 7pm"],
  [2, FRI, "Pizza night"],
  [2, SAT, "Leo's new place 🏠"],
  [2, SUN, "Long run 12k"],
  [3, MON, "Sam's drill back"],
  [3, WED, "Book cabin"],
  [3, THU, "Boulder w/ Leo"],
  [3, FRI, "Trivia night"],
  [3, SUN, "Long run 16k"],
  [4, MON, "On-call 📟"],
  [4, WED, "Package: keycaps"],
  [4, THU, "Climb 7pm"],
  [4, SAT, "Ana's 40th 🎉"],
  [4, SUN, "Taper 10k"],
  [5, MON, "Hand off on-call"],
  [5, WED, "Carb load 🍝"],
  [5, THU, "Lead climb"],
  [5, SAT, "Pick up race bib"],
  [5, SUN, "Race day! 21k 🏃"],
  [6, TUE, "Rest. Eat."],
  [6, THU, "Climb 7pm"],
  [6, FRI, "Cabin w/ Sam"],
  [6, SAT, "Cabin 🌲"],
  [6, SUN, "Drive home"],
  [7, MON, "Dentist 8:30"],
  [7, WED, "Solder the keeb"],
  [7, THU, "Boulder w/ Leo"],
  [7, SAT, "Repair café 10am"],
  [8, MON, "On-call 📟"],
  [8, THU, "Climb 7pm"],
  [8, FRI, "Pizza night"],
  [8, SUN, "Easy run 6k"],
];

const WORK: readonly Placed[] = [
  [-4, WED, "Sprint demo"],
  [-3, TUE, "1:1 Maya"],
  [-2, WED, "Sprint demo"],
  [-2, THU, "Postmortem 2pm"],
  [-1, TUE, "1:1 Maya"],
  [-1, WED, "Planning 10am"],
  [0, TUE, "Talk dry run 4pm"],
  [0, WED, "Sprint demo"],
  [0, FRI, "Freeze 3pm"],
  [1, WED, "Out: conf"],
  [1, THU, "Out: conf"],
  [1, FRI, "Out: conf"],
  [2, TUE, "1:1 Maya"],
  [2, WED, "Sprint demo"],
  [3, WED, "Planning 10am"],
  [4, WED, "Sprint demo"],
  [4, THU, "Team lunch"],
];

/** The Monday of the week `now` falls in, as a day key. */
export function mondayOf(now: Date): DayKey {
  // `getDay()` counts from Sunday; the week here starts on Monday.
  const back = (now.getDay() + 6) % 7;
  return addDays(dayKeyOf(now), -back);
}

function place(rows: readonly Placed[], now: Date): CalendarDoc {
  const monday = mondayOf(now);
  const entries: CalendarDoc["entries"] = {};
  for (const [week, weekday, text] of rows) {
    entries[addDays(monday, week * 7 + weekday)] = text;
  }
  return { version: DOC_VERSION, entries };
}

/** The work calendar's slug — the one the app's own first-run registry
 *  seeds beside the personal one (`useCalendars`). */
export const WORK_SLUG = "work";

/** Every demo calendar's document, keyed by calendar slug, around `now`. */
export function buildDemoDocs(
  now: Date = new Date(),
): Record<string, CalendarDoc> {
  return {
    [DEFAULT_CALENDAR_SLUG]: place(PERSONAL, now),
    [WORK_SLUG]: place(WORK, now),
  };
}

/** The personal calendar alone — what the Developer tab's toggle shows. */
export function buildPersonalDoc(now: Date = new Date()): CalendarDoc {
  return place(PERSONAL, now);
}
