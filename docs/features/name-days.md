# Name days: the list and the search

An almanac prints **one** spelling of each name. The Swedish one prints
"Niklas" — so a Nicklas, a Niclas or a Nichlas looking for his name day finds
nothing, even though the name is right there. The name-day search exists to
close that gap: type the name the way _you_ spell it, and get the day the
almanac celebrates it on.

## Getting there

Tap **any name** in a day's name-day caption — in the month grid, the week
planner or the day list. Tapping anywhere else in the cell still opens the
day's note.

That mirrors the way a holiday's name opens
[the holidays screen](vacation-planner.md), and for the same reason: the text
you are asking about is already in front of you, so it doubles as the way in.

Unlike the holidays screen this one is a **dialog** rather than a destination.
You are asking a question about a name, not leaving the calendar — and the
answer takes you back into it: tapping a name moves the calendar to that name
day in the year on display and closes the dialog.

## Two modes, one field

It opens as **the list**: every name in the almanac, alphabetically, under
sticky initials, scrolled to the name you tapped and marked there. You tapped
a name to see the names, and landing in the alphabet where that name is keeps
the tap meaningful without demanding a query you did not type. Browsing it is
a perfectly good way to use the screen — that is how you find out that Helena
and Elin share 31 July.

Typing in the field at the top turns it into **the search**. That is the whole
mode switch: an empty field is the alphabet, a filled one is an answer, and
clearing the field puts you back in the alphabet where you were.

The alphabet is the country's own — `localeCompare` in the pack's collation,
so a Swedish list ends Å, Ä, Ö after Z, which is where a Swede looks for
them.

## What it matches

Three things happen to every name, the query included, before anything is
compared.

**1. The spelling is folded to its sound** (`src/app/locale/nameKey.ts`).
Every rule is a pair of spellings the almanac could have chosen between:

| Written                   | Folds to     | Rule                                            |
| ------------------------- | ------------ | ----------------------------------------------- |
| Nicklas · Niclas · Niklas | `niklas`     | hard `c` → `k`, doubles collapse                |
| Christoffer · Kristoffer  | `kristofer`  | `ch` → `k`, doubles collapse                    |
| Sophia · Sofia            | `sofia`      | `ph` → `f`                                      |
| Cecilia · Sesilia         | `sesilia`    | soft `c` → `s`                                  |
| Alexander · Aleksander    | `aleksander` | `x` → `ks`                                      |
| Elisabeth · Elisabet      | `elisabet`   | `th` → `t`                                      |
| Sylvia · Silvia           | `silvia`     | `y` → `i`                                       |
| Göran · Jöran             | `joran`      | soft `g` → `j`                                  |
| Åsa · Asa · Désirée       | `asa`, …     | accents fold, so any keyboard can type the name |
| Britt-Marie · Britt Marie | `britmarie`  | hyphens and spaces are not spelling             |

The rules are **per language** and live in the country pack
(`nameSpelling`) beside the name table, exactly like the hyphenation rules —
"when is a `c` an `s`" is country knowledge. See
[locale packs](locales.md#name-day-spelling).

The folding is calibrated to pull spellings of one name together **without**
pulling two names into one: across the 627 names of the Swedish almanac it
produces 624 keys, and the only three it merges are Marit/Märit, Marta/Märta
and Silvia/Sylvia — three pairs of the same name.

**2. The folded query is matched** against every folded name, best first:
an exact sound match, then names starting with it (so a half-typed name
already finds its owner), then names containing it.

**3. What is left is allowed a slip or two.** A query of four or five letters
may be one edit away from the name, six or more may be two — counted with
Damerau-Levenshtein, so a transposition ("Niklsa") costs one edit and not two.
Queries of three letters or fewer get no allowance at all: at that length one
edit is a different name, and the prefix matches are the useful ones anyway.

These last hits are guesses, so the screen says so — they sit under a
**Similar names** heading rather than in the list as though the almanac
spelled them that way.

## Reading the rows

Every row — in either mode — is a name and the date it is celebrated, in the
country calendar's own language ("Niklas — 6 december"). Tap one to go there.

The name-day table has no year in it, so the row lands you on that date in the
year the calendar was already showing.

## Implementation notes

- `src/app/locale/nameKey.ts` — the folding machinery; rules per pack.
- `src/app/nameSearch.ts` — the index, the scoring and the edit distance.
  Pure functions over a pack, covered by `tests/name_search_test.ts` with no
  DOM.
- `src/app/NameDaySearch.tsx` — the surface. The shell is the framework's
  `Modal` (full-screen on a phone, Escape, focus restore); the list, the two
  modes and the row are app-local. The framework's `SearchModal` is
  deliberately **not** used here: it answers an empty query with a "type to
  search" prompt, and this screen answers it with the almanac.
- `src/app/NameDayNames.tsx` — the caption the three views share, where each
  name is its own tap target. The separators sit **outside** the tappable
  spans so the run still reads and breaks as one piece of text.

A pack without a name-day tradition (`nameDays: null`, e.g. `en-GB`) has no
names to tap, so the search is simply never reachable there.
