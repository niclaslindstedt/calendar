# Holidays and the vacation planner

A screen that answers two questions: when are this year's public holidays,
and which days should you book to get the most time off for them.

## Getting there

Tap a **holiday's name** in any day cell — the month grid, the week planner,
or the day list. The name is already on screen and it is exactly what you are
asking about, so it doubles as the way in. Tapping anywhere else in the cell
still opens the day's note.

Or take the shortcut: **Settings → General → Vacation → Open the vacation
planner**, right under the allowance the planner spends. The gesture above is
quick once you know it and invisible until then, so the section that sets the
allowance also points at what spends it. The shortcut **saves** the dialog on
its way out — the allowance you just typed is the one the plan is computed
from — and opens the planner on the year the calendar was showing.

There is deliberately no fourth segment in the top menu: a 393 px portrait bar
does not fit one without demoting Month, Week, or Day list. Any top-menu
action (a view switch, a press of the view you are already in) leaves the
screen again, as does the back arrow.

Swipe left and right — or use the ‹ › arrows — to move between years, exactly
as the month and week views move between periods.

## The two modes

A segmented control at the top switches between them.

**Holidays** lists the year's holidays with their weekday. Names print red
when the calendar prints them red. A day that is _named_ but is still one you
work — a [holiday eve](locales.md#holiday-eves) your agreement does not hand
back — is marked **Arbetsdag / Workday**, or **Halvdag / Half day** where it
is one, because that is the difference between a day you are given and a day
you have to book.

**Planner** turns those holidays into a plan for the year.

## What the planner computes

Its unit is the **bridge**: a short run of workdays between two stretches of
free time, where booking the run joins them up. A holiday on Thursday makes
the Friday worth one vacation day for a four-day weekend; a holiday on
Wednesday makes Thursday and Friday worth two days for a five-day break.

Rules the planner follows:

- **A free day** is a weekend (`restWeekdays`) or a public holiday
  (`Holiday.off`). It reads `off`, never `red` — see
  [ink vs. time off](locales.md#ink-vs-time-off).
- **Which eves are free is your setting, not the country's.** The planner
  reads the pack as your workplace sees it (Settings → Calendar → **Holiday
  eves**), so it never offers to spend an allowance day on a Julafton you do
  not work — and goes straight back to offering it if you say you do. A
  **half day counts as a workday**: you still book a whole vacation day to
  take one off. See [holiday eves](locales.md#holiday-eves).
- **Every suggestion must involve a public holiday.** Without this rule the
  planner is technically correct and practically useless: any Friday of the
  year returns three days off for one, there are 52 of them, and they bury the
  dozen suggestions worth reading. Nobody needs to be told that a Friday off
  makes a long weekend.
- **Nothing longer than a working week** is offered as a bridge. Past that a
  "bridge" is just a holiday you booked.
- **Only strictly profitable days are spent.** Once a break has been stretched
  to where another day buys exactly one more day, the planner stops and hands
  the rest of the allowance back rather than padding the plan.

The allowance comes from **Settings → General → Vacation** (`vacationDays`,
default 25 — the Swedish statutory minimum and a typical UK full-time
entitlement). It lives there so the planner screen is pure output: you read a
plan, you do not configure one.

## Reading the plan

The headline is `N days booked buys M days off`, then the longest single break
and any allowance left over. Below it, one row per **break** — not per
suggestion.

That distinction is the point. Booking the Friday after New Year, the Monday
after that weekend, and the days after Epiphany is three separate suggestions
but **one** eleven-day break, and listing them separately would read as three
holidays. Every figure on the screen is measured off the chosen day set rather
than accumulated as suggestions are picked, so two suggestions that share a
weekend are never sold twice.

## Implementation notes

Everything is pure domain logic in `src/app/vacation.ts` — a locale pack, a
year and a budget in, plain data out — so it is covered end to end by
`tests/vacation_test.ts` with no DOM.

Selection is greedy on _marginal_ return: each round every affordable
candidate is scored by how many extra free days it would add to the plan
already chosen, and the best per-day wins. That is a knapsack, so greedy is
not provably optimal; it is chosen because the exact answer is not worth the
runtime here, and it can never overstate its result — the totals are measured,
not accumulated.
