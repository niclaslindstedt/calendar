// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// United Kingdom country pack. UK wall calendars start the week on Monday,
// commonly print ISO week numbers only in business diaries (so they're off by
// default here), mark Sundays red, and have no name-day tradition.
//
// This file is the template for new country packs: copy it, adjust the
// fields, and register the export in `./index.ts`.

import type { LocalePack } from "./types.ts";

export const enGB: LocalePack = {
  id: "en-GB",
  label: "United Kingdom",
  bcp47: "en-GB",
  weekStartsOn: 1,
  showWeekNumbersDefault: false,
  showNameDaysDefault: false,
  redWeekdays: [0],
  nameDays: null,
};
