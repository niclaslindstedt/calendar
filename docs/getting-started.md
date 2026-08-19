# Getting started

Calendar is a wall calendar you glance at — not a reminder machine. This page
walks through the first five minutes.

## Open the app

Run it locally (`npm run dev`) or open the deployed app. You land on the
current month in the **month grid**: weekday headers, the days of the month,
and — depending on the country setting — week numbers in the margin and name
days in each cell. Sundays are red, like on paper.

## Write on a date

Pressing a date puts a caret in it — no dialog, no placeholder, just the
blank day and a cursor. Type: `Dinner Ada 18:00`. The text lands on the
calendar as you type and is saved automatically. Enter starts a **new line**
in the note; Esc, Ctrl/⌘+Enter, or clicking elsewhere puts the pen down. There
are no times, alarms, or notifications — the note is meant to be **read by
you** the next time you look at the calendar.

Keep notes short: the text shrinks as it grows so it always fits its cell,
and once it is as small as it goes, the day is full and takes no more text — a
line break costs a line of that room like any other typing, so a cell with no
room left refuses it too.
If you routinely need more room, use the week planner or the day list.

## The three views

The switcher in the top bar toggles:

- **Month** — the whole month, one screen, wall-calendar style. When a month
  image pack is installed, the artwork hangs above the grid.
- **Week** — one week at a time, one generous row per weekday, laid out like a
  printed column calendar. The date is set big at the head of the row with the
  weekday beside it and the day's name days under that; the middle of the row
  is yours to write in; and the right-hand margin carries the week number (on
  the day the week opens) and the holiday's name (along the bottom of the
  row). The day that opens a week draws a doubled rule above it, so paging
  through the weeks you can see where one ends and the next begins. How big
  the date is set, how the week number is phrased, whether each day's number
  in the year is printed and whether rows may grow are all yours to choose —
  see [Week planner](#week-planner). (On a landscape phone, where seven rows
  leave no height for a stack, everything lies back down into one line.)
- **Day list** — the month as a vertical scroll, one row per day, laid out
  like the week planner: the date with the weekday beside it and the day's
  names under that, your note filling the middle, and the week number and the
  holiday's name in the right-hand margin. A doubled rule crosses the list
  wherever the week changes — the one thing this view can show that a
  single-week strip cannot. In Settings → Calendar you can choose whether rows
  keep a fixed height or grow with their text (the week planner has the same
  choice, made separately). The month heading stays pinned to the top of the
  list as you scroll, so which month you are reading is never off screen.

**Swipe left or right** in any of the three views to turn the page — the
neighbouring period follows your finger and settles into place. The month view
fills the screen exactly and never scrolls at all, and so does the week planner
until you let its rows grow; the day list always scrolls up and down, and a
clearly vertical drag in a view that scrolls scrolls it instead of turning the
page. The holidays screen pages between years the same way, with
its header staying put while only the year's list moves.

The **‹ ›** arrows flanking the month heading do the same thing with the same
animation. To jump back to the current day, **press the view you are already
in** — Month while in Month, Week while in Week. Pressing a different view
switches to it and keeps the period you were reading. The arrows sit on the
heading rather than in the top bar so the view switcher has room on a portrait
phone.

## Namespaces

The button at the top left is the namespace switcher: separate calendars, each
with its own notes, one for home and one for work. Tap it to switch, or to
open **Manage namespaces…** and create, rename, restyle or delete one. See
[namespaces](features/namespaces.md).

## Holidays and vacation planning

Tap a **holiday's name** in any view to open the holidays screen for that
year: the year's public holidays, and a planner that works out which days to
book to get the most time off — the Friday after a Thursday holiday, the days
that bridge Easter into a ten-day break. Set your allowance in
Settings → General → Vacation, where **Open the vacation planner** takes you
straight there (saving the dialog on the way). See
[the vacation planner](features/vacation-planner.md).

## Name days

Tap **any name** in a day's name-day caption to open the almanac: every name
in the country calendar, alphabetically, opened at the name you tapped. Type
in the field at the top to search it — and spell the name your own way, since
the search matches on how a name _sounds_: "Nicklas" finds Niklas, "Sophia"
finds Sofia, "Christoffer" finds Kristoffer. Tap any row to go to that name
day in the calendar. See [name days](features/name-days.md).

## Settings (the cogwheel, top right)

Settings opens a tabbed dialog: the sections sit in a rail down the left on a
wide screen, and behind the burger button in the header on a phone. Changes to
the calendar's look preview live behind the dialog and are kept with **Save**
— **Cancel** (or Escape) drops them, and **Reset to defaults** restores the
stock look without touching your storage connections or developer switches.

- **General** — UI language (English / Svenska), the country calendar
  (United Kingdom / Sverige — sets start of week, week numbers, red days,
  name days), the week-number and name-day toggles, and developer mode. A
  fresh install picks the country calendar from your device's language
  settings; changing it here pins your choice. **Vacation days a year**
  (default 25) is the allowance the vacation planner spends, and **Open the
  vacation planner** saves the dialog and jumps to the planner for the year on
  display.
- **Calendar** — **Holiday eves** (which of the country's eves you actually
  work), then **View**: how each view prints a day — what sits where, the face
  each piece is set in, and how big it is — arranged on a live sample of the
  view you picked. After that, the calendar's own behaviour: whether the days
  that have passed are crossed off, the day-list row height, the week
  planner's margin, and the colour the period heading is banded with. See
  [Holiday eves](#holiday-eves), [View](#view), [Passed days](#passed-days),
  [Week planner](#week-planner) and [Heading colour](#heading-colour).
- **Appearance** — the theme, and only the theme: **Follow device** (the
  default, which tracks your device's light / dark preference), **Light**,
  **Dark**, or **Custom**, plus the palette variant within the light and dark
  families.
- **Storage** — where your calendar lives. See [storage.md](storage.md).
- **Developer** — demo data, log capture, build info, the update check, and
  the device's own geometry (visible in developer mode). The **Device** block
  prints the viewport, the four safe-area insets in CSS order
  (top / right / bottom / left), the space above the top menu's buttons, the
  gutter a view's last row is getting, and the display mode — the numbers to
  quote when a layout looks wrong on a phone.
- **Logs** — the in-app log (visible once log capture is on).

### Holiday eves

An eve — Julafton, Midsommarafton, Valborgsmässoafton — is a **working day by
law** in Sweden, and yet almost nobody works some of them, because almost
every _kollektivavtal_ hands those back. Which ones is a fact about your
employer, not about the country, so it is a setting.

**Settings → Calendar → Holiday eves** lists the eves the country calendar
names, each with the date it falls on this year and three answers: **Ledig /
Day off**, **Halvdag / Half day**, **Arbetsdag / Working**. They start on
what most collective agreements say — for Sweden that is Julafton,
Midsommarafton and Nyårsafton off, Trettondagsafton a half day, and
Skärtorsdagen, Valborgsmässoafton and Allhelgonaafton worked — so if your
workplace is ordinary you can leave the whole section alone.

What it changes:

- The [vacation planner](features/vacation-planner.md) stops offering to book
  a day you do not work, and starts offering one you do. Those are the
  cheapest days in the year to buy a long weekend with, so the difference is
  worth getting right.
- The holidays list marks an eve you work **Arbetsdag / Workday**, or
  **Halvdag / Half day** where you have said so. A half day is still a
  workday to the planner — you book a whole vacation day to take one.

Picking the shipped answer again clears your override rather than pinning it,
and **Back to the agreements** puts the whole section back at once. Changing
the country calendar resets the list, because eve names belong to a country.
A country without the tradition — the United Kingdom names none — has no
section at all.

### View

The three views are three different pages. A month cell is 47 px wide with
captions measured to hold a name on one line; a week-planner row is the width
of the screen with a lane down its left. A size that makes the month grid
readable leaves the week planner looking half-set — so **how a day is printed
is answered per view**, not once for the whole app.

**Settings → Calendar → View** leads with a view picker — the same
**Month / Week / Day list** control as the top menu — and everything under it
belongs to the view you picked.

> **The week planner and the day list share one answer.** They print the same
> row from the same code, so a setting moved in one moves in the other; what
> the third button changes is which of the two the sample shows. A week row is
> a band and a list row is a line, and both are worth looking at.

#### Where the pieces go

Under the picker is a sample day with every piece on it. Tap any of its four
quadrants and pick what belongs there — the sample rearranges immediately, and
so does the calendar behind the dialog.

In the **month view** the four quadrants are the cell's four corners. The
defaults reproduce a printed wall calendar: the date large in the
**top-right** corner, the holiday name and the day's names stacked in the
**bottom-right** one (holiday first), and your note filling the space between.

- **Day number**, **Holiday name** and **Name days** each live in one corner;
  pieces sharing a corner stack in that order.
- The day number **floats**, so a caption sharing its corner's band flows
  around it — a short name sits beside the number, a long one drops under it.
- **Your note** has no corner: it takes the room the corners leave, and its
  own control puts it at the top of that space, centred in it, or at the
  bottom.

In the **week planner and the day list** the four quadrants are the row's two
margins, each with a top and a bottom end: a **lane** on the left, where a
printed column calendar sets the date, and a **rail** on the right, where it
sets its marginalia. The defaults are that arrangement — the date at the head
of the lane with the day's names under it, the week number at the top of the
rail and the holiday's name along the bottom of it — and the note always takes
the width between the two.

- The weekday's name travels with the day number wherever it goes.
- A margin nothing is printed in is **not drawn at all**, so a plain English
  month — no name days, no week numbers, the odd holiday — gets its full row
  width for writing instead of a dead gutter down ninety rows.

Captions wrap rather than truncate, and a name is only broken across lines
when it cannot fit one whole: "Elsa, Isabella" breaks after the comma, while
"Midsommarafton" breaks at a syllable boundary with a hyphen.

#### Face and size

Under the sample is one row per piece: the **face** on its label line, the
**size** as buttons beneath it. Both are previewed in the sample and on the
calendar behind the dialog as you change them.

A printed calendar doesn't set its whole page in one font, and neither does
this one. The five faces are **Almanac** (system serifs, no download),
**Mono**, **Sans**, **Serif** and **Dyslexic** (OpenDyslexic), and each option
in the dropdown is set in the face it offers. The defaults are the printed
look: the date in **Almanac**, the captions and your own text in **Mono**, and
the week number in the almanac's italic in the strip views and plain in the
month grid's gutter. Everything else — the month title, the weekday headers,
the app's own buttons and dialogs — keeps the app font, so changing a face
restyles the calendar rather than the program around it.

The **day number**, **holiday name**, **name days** and **week number** are
the almanac's own printing, and their three sizes — **Small**, **Medium**,
**Large** — are steps around the size each was measured at. **Medium** is that
measurement (the middle button, and what a fresh install uses), with **Small**
a fifth smaller and **Large** a quarter bigger.

**Your text** — what you write on a day — has a fourth button, because it is
sized against the room the view actually leaves it rather than against a fixed
size:

- **Dynamic** (the default) — a note shrinks as you write, so it always fits
  the room the day has left over after its number, holiday and name days. Once
  it is as small as that view allows, the day is full: the next keystroke is
  refused rather than pushed out of sight. Deleting always works.
- **Small / Medium / Large** — the text stays at that size no matter how much
  you write, and the day fills up sooner because it never shrinks.

A note that no longer fits — because you pinned a bigger step, or because it
was written in a view with more room — is cut off at the last line that fits
and ends in an ellipsis, so it stops short of the day's captions instead of
running under them.

A month cell is only 47 px wide, so the caption sizes there are measured
rather than chosen: a face wider than the default gives the difference back
automatically, and the longest name day still holds a full line instead of
being clipped. On **Large** the longest names start breaking across two lines
— the calendar re-picks its hyphenation points for the size you chose, so a
long name breaks at a syllable rather than being clipped. The strip views have
the opposite freedom: their lane widens with the name-day step, so bigger
captions keep the same number of lines and the note beside them gives up the
width instead.

### Passed days

**Settings → Calendar → Passed days** crosses off the days behind you, the
way you would on a paper calendar. It is **off** by default — a calendar you
have written on is a preference, not an improvement — and there are two
choices to make once it is on:

- **Mark** — **Off**, **Cross ✕** (two strokes) or **Slash /** (one). The
  slash is the cross's own diagonal, drawn once.
- **Covers** — **Whole day** draws the mark corner to corner across the day
  (a month cell, a week-planner row, a day-list row), while **The date**
  crosses only the day number and leaves the holiday, the name days and
  anything you wrote untouched.

The mark applies in all three views, and **today is never marked**: the run
of crosses stops at the day you are in, which is what makes it worth having.
The sample day in [View](#view) is drawn as a passed day, so the mark you pick
is previewed there as well as on the calendar behind the dialog.

### Week planner

**Settings → Calendar → Week planner** sets up the week strip. Everything here
is previewed on the calendar behind the dialog as you change it.

- **Day of year** — off by default. On, each row prints the day's number in
  the year (1–366) in small grey type beside the weekday, the way a Swedish
  column calendar does.
- **Date size** — **Small**, **Medium**, **Large** or **Huge**. Medium is the
  measured default (the largest date that still leaves a portrait row its
  weekday and a line of names); **Huge** is twice that — a wall-planner date,
  for a week read from across the room. This is the week strip's own step
  ladder, and the view's own **Day number** size ([View](#view)) still applies
  on top of it.
- **Week number** — how the margin phrases it: **Week 34**, **w 34** (the
  printed almanac's abbreviation, and the default) or plain **34**. The
  buttons are labelled with what they print. The number appears on the day
  that opens the week, and only when week numbers are on
  (Settings → General → Week numbers). The day list prints its week numbers
  the same way — it is the same piece of almanac in the same margin — but it
  keeps its own date size, because its row is a line rather than a band.
- **Row height** — **Fixed** fits the whole week on one screen, every row the
  same height. **Dynamic** grows a row with what you have written in it and
  lets the week scroll, for people who write more on some days than others.

### Heading colour

**Settings → Calendar → Heading** bands the period heading — the month and
year at the top of every view — in one of five print colours, the way a wall
calendar prints its masthead. It is **off** by default, which leaves the
heading plain.

The colour is spent twice: the band itself, and the week numbers in the week
planner's and the day list's margins, which are printed in the same ink. With
the band off those week numbers print in the page's own colour.

The band is exactly as wide as the calendar under it, and it replaces the
hairline the heading otherwise carries — a solid band is already an edge.

The five colours are chosen to hold white text on the band and to stay legible
as ink in both the light and the dark theme, so the choice does not have to be
revisited when the theme changes.

## Install as an app

The calendar is an installable PWA: use your browser's "Install app" /
"Add to Home Screen". It works offline; when a new version is deployed the
app shows a small "a new version is ready" prompt — nothing updates under
your feet mid-edit.
