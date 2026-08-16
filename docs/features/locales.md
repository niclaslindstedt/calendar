# Locale packs (country calendars)

A wall calendar looks different in different countries. Everything that
differs is bundled into one **country pack** per country under
`src/app/locale/`:

- `weekStartsOn` — first day of the week (Monday in both current packs).
- `showWeekNumbersDefault` — whether ISO week numbers print by default
  (Sweden: yes; UK: no).
- `showNameDaysDefault` + `nameDays` — the name-day table (`"MM-DD"` → names),
  or `null` for countries without the tradition.
- `redWeekdays` — which weekdays print red (Sundays in both).
- `bcp47` — drives month/weekday names via `Intl`, so packs carry no month
  name tables.

The UI language is a **separate** setting: a Swede abroad can run the English
UI over the Swedish calendar, or vice versa.

## Current packs

| Pack    | Week start | Week numbers | Name days            | Red days |
| ------- | ---------- | ------------ | -------------------- | -------- |
| `en-GB` | Monday     | off          | none                 | Sundays  |
| `sv-SE` | Monday     | on           | Swedish almanac list | Sundays  |

The Swedish name-day table follows the modern almanac list (including the
2022 additions — Maja, Saga, William, Fatima, Kevin, Tim, Cornelia, …). Days
with no celebrated name (1 January, 2 February, 25 March, 24 June,
1 November, 25 December, and 29 February) simply have no entry.

## Adding a country

Packs are deliberately self-contained — adding one is a copy-paste:

1. Copy `src/app/locale/en-gb.ts` to `src/app/locale/<bcp47>.ts` (e.g.
   `de-de.ts`).
2. Fill in the fields. If the country has name days, add the table (see
   `sv-se.ts` for the shape).
3. Register the export in `src/app/locale/index.ts` (`LOCALES` array).
4. Add a test block in `tests/locale_test.ts`.

No other code changes: the country picker, the views, and the toggles all
read the registry. **Never** add country conditionals outside
`src/app/locale/` — that's what keeps packs copy-pasteable.
