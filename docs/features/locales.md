# Locale packs (country calendars)

A wall calendar looks different in different countries. Everything that
differs is bundled into one **country pack** per country under
`src/app/locale/`:

- `weekStartsOn` — first day of the week (Monday in both current packs).
- `weekNumbering` — the country's week-numbering rule. Both packs use
  ISO-8601, the Swedish standard (week 1 holds the year's first Thursday);
  a future country with a different rule adds its variant here.
- `showWeekNumbersDefault` — whether week numbers print by default (Sweden:
  yes; UK: no). Always overridable in Settings → General — some people
  don't want them.
- `showNameDaysDefault` + `nameDays` — the name-day table (`"MM-DD"` → names),
  or `null` for countries without the tradition.
- `redWeekdays` — which weekdays print red (Sundays in both).
- `holidays(year)` — a **rule engine**, not a year table: the pack computes
  its holidays for any year from rules (see below).
- `bcp47` — drives month/weekday names via `Intl`, so packs carry no month
  name tables.

The UI language is a **separate** setting: a Swede abroad can run the English
UI over the Swedish calendar, or vice versa.

## Which pack a fresh install starts on

There is no fixed default: `matchLocaleId()` in `src/app/locale/index.ts`
picks the pack from the device's own preferred languages
(`navigator.languages`), most-preferred first. Each tag is tried in turn,
strongest match first:

1. the **exact** pack id — `sv-SE` → `sv-SE`;
2. the **country** — `en-SE` → `sv-SE`, because an English speaker living in
   Sweden still wants the Swedish wall calendar;
3. the **language** — `en-US` → `en-GB`, `sv-FI` → `sv-SE`.

The first tag that matches anything wins, so a device asking for `sv-SE, en`
never falls through to the English pack. When nothing matches (a German
phone, say) the pack is `FALLBACK_LOCALE_ID` — `en-GB`.

This only seeds the setting. Once the user picks a country in Settings →
General the choice is persisted, and the device's locale is never consulted
again.

## Current packs

| Pack    | Week start | Week numbers | Name days            | Red days |
| ------- | ---------- | ------------ | -------------------- | -------- |
| `en-GB` | Monday     | off          | none                 | Sundays  |
| `sv-SE` | Monday     | on           | Swedish almanac list | Sundays  |

The Swedish name-day table follows the modern almanac list (including the
2022 additions — Maja, Saga, William, Fatima, Kevin, Tim, Cornelia, …). Days
with no celebrated name (1 January, 2 February, 25 March, 24 June,
1 November, 25 December, and 29 February) simply have no entry.

## Holidays and red days

Holidays are **computed per year from rules**, never listed per year. The
shared computus helpers live in `src/app/locale/computus.ts` (Easter via the
Meeus/Jones/Butcher algorithm, "nth weekday of month", "the Saturday
between…"); each pack expresses its national rules with them:

- **Sverige** — the thirteen official _röda dagar_ (fixed days like
  Nyårsdagen / Första maj / Nationaldagen / Juldagen; the Easter chain
  Långfredagen → Annandag påsk → Kristi himmelsfärdsdag → Pingstdagen;
  Midsommardagen = the Saturday 20–26 June; Alla helgons dag = the Saturday
  31 Oct–6 Nov), rendered **red** with their names — plus the three eves
  every wall calendar names (Midsommarafton, Julafton, Nyårsafton), named
  but not red.
- **United Kingdom** — the England & Wales bank holidays (Good Friday /
  Easter Monday from the computus, the three movable Mondays, New Year /
  Christmas / Boxing Day **with weekend substitute rules**), named on the
  calendar; only Sundays print red.

A day is red when its weekday is in `redWeekdays` **or** a holiday with
`red: true` falls on it (`isRedDay`). Holiday names render in the pack's own
language — like a printed calendar.

## Adding a country

Packs are deliberately self-contained — adding one is a copy-paste:

1. Copy `src/app/locale/en-gb.ts` to `src/app/locale/<bcp47>.ts` (e.g.
   `de-de.ts`).
2. Fill in the fields. If the country has name days, add the table (see
   `sv-se.ts` for the shape).
3. Register the export in `src/app/locale/index.ts` (`LOCALES` array).
4. Add a test block in `tests/locale_test.ts`.

No other code changes: the country picker, the views, the toggles, and the
device-locale match above all read the registry — a new pack starts being
auto-selected for matching devices the moment it is registered. **Never** add
country conditionals outside
`src/app/locale/` — that's what keeps packs copy-pasteable.
