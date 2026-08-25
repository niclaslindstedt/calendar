# Locale packs (country calendars)

A wall calendar looks different in different countries. Everything that
differs is bundled into one **country pack** per country under
`src/app/locale/`:

- `weekStartsOn` — first day of the week (Monday in all seven current packs).
- `weekNumbering` — the country's week-numbering rule. Every pack uses
  ISO-8601 (week 1 holds the year's first Thursday); a future country with a
  different rule adds its variant here.
- `showWeekNumbersDefault` — whether week numbers print by default. On where
  the country schedules by them (Sweden's _veckonummer_, Germany's
  _Kalenderwoche_, the Dutch _weeknummer_, Finland's _viikko_, Norway's
  _uke_), off where they are a business-diary extra (UK) or simply not what
  the almanac sets (France). Always overridable in Settings → General — some
  people don't want them.
- `showNameDaysDefault` + `nameDays` — the name-day table (`"MM-DD"` → names),
  or `null` for countries without the tradition.
- `redWeekdays` — which weekdays print red (Sundays in both).
- `holidays(year)` — a **rule engine**, not a year table: the pack computes
  its holidays for any year from rules (see below).
- `eves` — the holiday **eves** the country names, and what most of its
  collective agreements make of each. Empty for a country with no such
  tradition (see below).
- `nameSpelling` — how the language writes the same sound, so the name-day
  search finds a name spelled the searcher's way (see below).
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
3. the **language** — `en-US` → `en-GB`, `sv-DK` → `sv-SE`, `de-AT` and
   `de-CH` → `de-DE`.

Rule 2 beating rule 3 is the interesting one now that there are seven packs:
`sv-FI` resolves to **`fi-FI`**, not `sv-SE`. A Swedish-speaking Finn lives
by Finland's red days and Finland's almanac; the language they read the app
in is the other setting.

The first tag that matches anything wins, so a device asking for `sv-SE, en`
never falls through to the English pack. When nothing matches (a Spanish
phone, say) the pack is `FALLBACK_LOCALE_ID` — `en-GB`.

This only seeds the setting. Once the user picks a country in Settings →
General the choice is persisted, and the device's locale is never consulted
again.

## Current packs

| Pack    | Country        | Week start | Week numbers | Name days            | Eves |
| ------- | -------------- | ---------- | ------------ | -------------------- | ---- |
| `de-DE` | Deutschland    | Monday     | on           | none                 | 2    |
| `fr-FR` | France         | Monday     | off          | none (see below)     | 0    |
| `nl-NL` | Nederland      | Monday     | on           | none                 | 2    |
| `nb-NO` | Norge          | Monday     | on           | Norwegian navnedager | 2    |
| `fi-FI` | Suomi          | Monday     | on           | Finnish nimipäivät   | 4    |
| `sv-SE` | Sverige        | Monday     | on           | Swedish almanac list | 7    |
| `en-GB` | United Kingdom | Monday     | off          | none                 | 0    |

All seven print Sundays red and take Saturday and Sunday as the weekend.

### The name-day tables

Three packs carry one, and each is the list that country's calendars
actually print:

- **Sverige** — the modern almanac list (including the 2022 additions —
  Maja, Saga, William, Fatima, Kevin, Tim, Cornelia, …). Days with no
  celebrated name (1 January, 2 February, 25 March, 24 June, 1 November,
  25 December, and 29 February) simply have no entry.
- **Suomi** — the Finnish-language almanac maintained by the Almanac Office
  of the University of Helsinki. It is carried **whole**, up to thirteen
  names on a day, rather than trimmed to what a month cell can show: the
  table is also what the [name search](name-days.md) and the
  [contacts matching](contacts.md) read, so trimming it would quietly make
  most Finnish names unfindable. A month cell shows what fits and clamps the
  rest, which is what the cell is built to do. Three days are nameless:
  1 January, 29 February, 25 December.
- **Norge** — the Norwegian navnedager, two or three to a day. The same
  three days are nameless.

Four packs carry `nameDays: null`, for three different reasons — and `null`
rather than an empty table is what turns the setting, the search and the
contacts tab off:

- **United Kingdom** and **Nederland** have no name-day tradition at all.
- **Deutschland** has one, but the _Namenstag_ is regional and Catholic
  rather than national — there is no single list a German calendar prints
  the way the Swedish almanac is printed. Adding one means picking a
  diocese's list and saying which.
- **France** is a gap rather than a decision. The _fête du jour_ is printed
  on every French calendar and is a specific list (the sanctoral of the
  _calendrier des postes_); the sources reachable when the pack was written
  disagreed on enough days that shipping one would have meant shipping days
  that are wrong. Fill it in from one named almanac, whole.

## Holidays and red days

Holidays are **computed per year from rules**, never listed per year. The
shared computus helpers live in `src/app/locale/computus.ts` (Easter via the
Meeus/Jones/Butcher algorithm, "nth weekday of month", "the Saturday
between…"); each pack expresses its national rules with them:

- **Sverige** — the thirteen official _röda dagar_ (fixed days like
  Nyårsdagen / Första maj / Nationaldagen / Juldagen; the Easter chain
  Långfredagen → Annandag påsk → Kristi himmelsfärdsdag → Pingstdagen;
  Midsommardagen = the Saturday 20–26 June; Alla helgons dag = the Saturday
  31 Oct–6 Nov), rendered **red** with their names — plus the seven
  _helgdagsaftnar_ (see below), named but never red.
- **United Kingdom** — the England & Wales bank holidays (Good Friday /
  Easter Monday from the computus, the three movable Mondays, New Year /
  Christmas / Boxing Day **with weekend substitute rules**), named on the
  calendar; only Sundays print red.
- **Deutschland** — the nine _bundeseinheitliche Feiertage_ as red days,
  plus Ostersonntag and Pfingstsonntag, which a calendar names even though
  they are Sundays anyway. The _Land_ holidays (Heilige Drei Könige,
  Fronleichnam, Mariä Himmelfahrt, Reformationstag, Allerheiligen, Buß- und
  Bettag = the Wednesday before 23 November) are **named and neither red nor
  off**: this app has one pack per country with no sub-region, and marking
  them off for the whole country would hand a Hamburger a day nobody gave
  them. Being wrong in that direction costs a reader in Bavaria one booked
  day; the other direction mis-plans everyone else's year.
- **France** — the eleven _jours fériés_, plus Pâques and Pentecôte. Vendredi
  saint and Saint-Étienne are férié only in Alsace-Moselle and are named the
  same way Germany's _Land_ holidays are. France names no eves; the French
  institution is the _pont_, which the [vacation planner](vacation-planner.md)
  already answers.
- **Nederland** — the clearest case of ink and time coming apart (below).
  Nine days are red **and** off; Goede Vrijdag and Bevrijdingsdag are
  officially recognised _feestdagen_ printed in red that most cao's have you
  work (`red: true, off: false`); Sinterklaas and Dodenherdenking are named
  and neither. Koningsdag is 27 April, moved back to the 26th when the 27th
  is a Sunday.
- **Suomi** — the thirteen official _pyhäpäivät_, with juhannuspäivä on the
  Saturday 20–26 June and pyhäinpäivä on the Saturday 31 Oct–6 Nov, the way
  Sweden pins midsommardagen and alla helgons dag.
- **Norge** — the twelve _røde dager_. The one that differs from Sweden next
  door is **Skjærtorsdag**, which is red in Norway and a working Thursday in
  Sweden, so Norwegian påske is a five-day close-down rather than a long
  weekend.

A day is red when its weekday is in `redWeekdays` **or** a holiday with
`red: true` falls on it (`isRedDay`). Holiday names render in the pack's own
language — like a printed calendar.

### Ink vs. time off

Two pairs of fields look alike and mean different things. Getting them
confused is the classic bug in this area, so the packs keep them apart:

| Question                      | Field                         |
| ----------------------------- | ----------------------------- |
| Is the day _printed_ red?     | `redWeekdays`, `Holiday.red`  |
| Does anybody _work_ that day? | `restWeekdays`, `Holiday.off` |

They come apart in both directions. A UK bank holiday shuts the country but
is printed black (`off: true`, `red: false`) — a vacation planner reading
`red` would conclude Britain has no holidays at all. Swedish Julafton is
named on every wall calendar and is a working day by law, yet almost nobody
works it (`red: false`, `off: true`). Saturday is a day off everywhere but
printed black, which is why `restWeekdays` is `[0, 6]` while `redWeekdays`
is `[0]`.

The [vacation planner](vacation-planner.md) reads `off` and `restWeekdays`,
never `red`.

## Holiday eves

An eve is the one part of a wall calendar that is not a fact about the
country but a fact about your **employer**. Swedish law names thirteen red
days and stops there: Julafton, Midsommarafton and Nyårsafton are, by law,
ordinary working days. In practice almost nobody works them, because almost
every _kollektivavtal_ hands them back — and the ones the agreements do not
hand back are just as consistently worked.

So a pack declares its eves (`src/app/locale/eves.ts`) with what most
agreements say, and the reader overrides the ones their workplace treats
differently in **Settings → Calendar → Holiday eves**. Each eve carries:

| Field        | Meaning                                                               |
| ------------ | --------------------------------------------------------------------- |
| `id`         | Stable key, persisted in settings. Unique within the pack.            |
| `name`       | The eve's name in the pack's own language — what the calendar prints. |
| `date(year)` | Where it falls: fixed for Julafton, computed for the movable ones.    |
| `collective` | `off` / `half` / `work` — what most of the country's agreements say.  |

Sweden's seven, in date order:

| Eve                | Falls on             | Default  |
| ------------------ | -------------------- | -------- |
| Trettondagsafton   | 5 January            | Half day |
| Skärtorsdagen      | Easter − 3           | Working  |
| Valborgsmässoafton | 30 April             | Working  |
| Midsommarafton     | Midsommardagen − 1   | Day off  |
| Allhelgonaafton    | Alla helgons dag − 1 | Working  |
| Julafton           | 24 December          | Day off  |
| Nyårsafton         | 31 December          | Day off  |

The other packs' eves, same idea in their own countries:

| Pack    | Eve              | Falls on          | Default  |
| ------- | ---------------- | ----------------- | -------- |
| `de-DE` | Heiligabend      | 24 December       | Day off  |
| `de-DE` | Silvester        | 31 December       | Day off  |
| `nl-NL` | Kerstavond       | 24 December       | Half day |
| `nl-NL` | Oudejaarsdag     | 31 December       | Half day |
| `nb-NO` | Julaften         | 24 December       | Day off  |
| `nb-NO` | Nyttårsaften     | 31 December       | Half day |
| `fi-FI` | Vapunaatto       | 30 April          | Half day |
| `fi-FI` | Juhannusaatto    | Juhannuspäivä − 1 | Day off  |
| `fi-FI` | Jouluaatto       | 24 December       | Day off  |
| `fi-FI` | Uudenvuodenaatto | 31 December       | Half day |

Påskafton and Pingstafton are deliberately absent: both always fall on a
Saturday, so they are already in `restWeekdays` and a switch for them would
do nothing. The UK and French packs declare `eves: []` — Christmas Eve is an
ordinary working day there with no agreement handing it back, and the settings
section disappears entirely.

`Holiday.eve` carries the resolved status, and `off` is `eve === "off"`. A
**half day is a workday** to the [vacation planner](vacation-planner.md) —
you still spend a whole vacation day to take one — but the holidays list
says which it is.

`withEveChoices(pack, choices)` is the seam: it returns the pack as this
reader's workplace sees it, and hands the base pack straight back when
nothing differs. `src/App.tsx` resolves it once so every view and the planner
agree on the year. Choosing the shipped answer again **clears** the override
rather than pinning it, so "unset" keeps meaning "whatever the agreements
say" — the same rule the week-number and name-day toggles follow with their
`null`. Switching country drops the map, because eve ids are a country's own
vocabulary.

## Name-day spelling

An almanac lists one spelling per name, and the spellings people use are not
typos — they are the same name written the way the language allows the same
sound to be written. `nameSpelling` is the per-language table that lets the
[name-day search](name-days.md) fold them together
(`src/app/locale/nameKey.ts` is the shared machinery):

| Field             | Meaning                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `softVowels`      | Vowels that soften a preceding `c`/`g` — Swedish softens on `ä` and `ö` as well as `e i y`.  |
| `softC` / `hardC` | What each `c` sounds like: "Cecilia" → `sesilia`, "Carl" → `karl`.                           |
| `softensG`        | Whether a soft `g` is a `j` ("Göran"/"Jöran"). True in both current packs.                   |
| `jOnsets`         | Word-initial clusters spoken as a bare `j` — Swedish `hj`, `dj`, `lj`, `gj`.                 |
| `digraphs`        | Multi-letter spellings of one sound: `ch` → `k`, `ph` → `f`, `th` → `t`, `qu` → `kv`.        |
| `letters`         | Single letters that only spell another's sound: `z` → `s`, `w` → `v`, `x` → `ks`, `y` → `i`. |
| `fold`            | Accented letters folded last of all, so a keyboard without `å ä ö` can still type the name.  |

Doubled letters are collapsed **after** the rules run, which is both the most
common variation of all ("Filippa"/"Filipa") and what makes "Nicklas" land on
`niklas` once its `c` has hardened.

Folding is a balance: it has to pull the spellings of one name together
without pulling two names into one. Across the 627 names of the Swedish
almanac these rules produce 624 keys, and all three merges are pairs of the
same name — Marit/Märit, Marta/Märta, Silvia/Sylvia. `tests/name_search_test.ts`
pins that, so a new rule that starts merging real names fails the suite.

## Hyphenation

Names too long for a month cell's line are broken at a syllable boundary
with a hyphen — "Henri-etta", never "Henrie-tta". The machinery is shared
(`src/app/locale/hyphenate.ts`, which seeds U+00AD soft hyphens at every
permitted break); the **rules** are per-language and live in the pack:

| Field         | Meaning                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| `vowels`      | The language's vowel letters.                                                                |
| `diphthongs`  | Vowel pairs spelling one sound, never split ("eu" in Bartolomeus).                           |
| `onsets`      | Consonant clusters that may open a syllable — consulted **only** for runs of three or more.  |
| `inseparable` | Two-letter clusters spelling one sound, moved whole ("ch").                                  |
| `neverOnset`  | Consonants that cannot open a syllable, so they close the previous one ("x" → "Alex-ander"). |

The important subtlety is that `onsets` is _not_ applied to two-consonant
runs. The languages here simply divide those — "Mag-nus", not "Ma-gnus", even
though "gn" opens _gnaga_. Applying the maximal-onset principle everywhere is
what a naive implementation gets wrong; restricting it to longer runs is what
recovers compound boundaries like "Lång-fredagen" and "Alexan-dra" for free.

Every pack's rules are held to the same invariants over everything that pack
can print in a caption — its name days and its holiday names —
by `tests/hyphenate_test.ts`: no break strands one or two letters, none
leaves a consonant run no syllable could open, and none leaves a fragment
without a vowel. That test is what a new pack's `onsets` list gets checked
against, and it matters because a wrong list fails silently: the break is
still offered, it is just illegal, and the month cell prints
"Pfing-stmontag" on somebody's wall.

A word is only offered break points when it cannot fit a caption line whole —
words shorter than `MIN_HYPHENATED_LETTERS` (12, measured against the month
cell's 45.8 px caption line at 393 px of viewport) are left alone. A soft
hyphen is an _opportunity_, and a greedy line breaker takes the last one that
fits, so a name carrying hyphens it does not need gets split to top up the
line before it: "Elsa, Isa-bella" instead of the "Elsa," / "Isabella" a
printed calendar prints. Every name in every pack fits a caption line whole
(the widest, "Bartolomeus", is 42.1 px, and the longest name in the Finnish
and Norwegian tables is eleven letters); the words that need breaking start
at "Långfredagen" and "Midsommarafton". Re-measure the constant together with the
caption font size — `tests/hyphenate_test.ts` pins what it assumes.

`hyphens: auto` is deliberately not used: it needs the engine to ship a
hyphenation dictionary for the language and silently does nothing without
one, which would make line breaking vary by device.

## Adding a country

Packs are deliberately self-contained — adding one is a copy-paste:

1. Copy `src/app/locale/en-gb.ts` to `src/app/locale/<bcp47>.ts` (e.g.
   `de-de.ts`).
2. Fill in the fields, including `flag` (the country's regional-indicator
   emoji pair, shown beside the label in the picker). If the country has name
   days, add the table (see
   `sv-se.ts` for the shape). Note `restWeekdays` and each holiday's `off`
   flag — see "Ink vs. time off" above — the `eves` list (`[]` if the country
   names none), and the `hyphenation` and `nameSpelling` rules for the
   language.
3. Register the export in `src/app/locale/index.ts` (`LOCALES` array), in the
   list's alphabetical-by-label order.
4. Add a row to `WEEK_RULES` in `native/src/snapshot.ts` — the widgets mirror
   every pack's `weekStartsOn` and `restWeekdays`, and
   `tests/native_snapshot_test.ts` fails until the row is there.
5. Add a test block in `tests/locale_test.ts`, and — if any of the pack's
   holiday dates are _computed_ rather than fixed — a multi-year table in
   `tests/holiday_years_test.ts`. A fixed date needs no five-year proof;
   an Easter chain, a "Wednesday before the 23rd" or a "Saturday between the
   20th and the 26th" does.

No other code changes: the country picker, the views, the toggles, and the
device-locale match above all read the registry — a new pack starts being
auto-selected for matching devices the moment it is registered. **Never** add
country conditionals outside
`src/app/locale/` — that's what keeps packs copy-pasteable.
