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
calendar as you type and is saved automatically. Enter or Esc (or clicking
elsewhere) puts the pen down. There are no times, alarms, or notifications —
the note is meant to be **read by you** the next time you look at the
calendar.

Keep notes short: the text shrinks as it grows so it always fits its cell,
and once it is as small as it goes, the day is full and takes no more text.
If you routinely need more room, use the week planner or the day list.

## The three views

The switcher in the top bar toggles:

- **Month** — the whole month, one screen, wall-calendar style. When a month
  image pack is installed, the artwork hangs above the grid.
- **Week** — one week at a time, one generous row per weekday. The date is set
  big at the head of a lane down the left, with the weekday, the holiday and
  the day's name days stacked under it; the rest of the row is yours to write
  in, with more room to read and write than a month cell. (On a landscape
  phone, where seven rows leave no height for a lane, those four pieces lie
  back down into a line with the note under them.)
- **Day list** — the month as a vertical scroll, one row per day with the
  day's name days beside the number. In Settings → Calendar you can choose
  whether rows keep a fixed height or grow with their text. The month heading
  stays pinned to the top of the list as you scroll, so which month you are
  reading is never off screen.

**Swipe left or right** in any of the three views to turn the page — the
neighbouring period follows your finger and settles into place. The month and
week views fill the screen exactly and never scroll at all; the day list still
scrolls up and down, and a clearly vertical drag there scrolls it instead of
turning the page. The holidays screen pages between years the same way, with
its header staying put while only the year's list moves.

The **‹ ›** arrows flanking the month heading do the same thing with the same
animation, and **Today** in the top bar jumps back to the current day. The
arrows sit on the heading rather than in the top bar so the view switcher has
room on a portrait phone.

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
  work), the month cell's layout (arranged on a sample day: tap a corner and
  pick what belongs in it), whether the days that have passed are crossed off,
  the day-list row height, the face each part of a day is set in, and how big
  each of them is printed. See [Holiday eves](#holiday-eves),
  [Month cell layout](#month-cell-layout), [Passed days](#passed-days),
  [Type](#type) and [Text size](#text-size).
- **Appearance** — the theme, and only the theme: **Follow device** (the
  default, which tracks your device's light / dark preference), **Light**,
  **Dark**, or **Custom**, plus the palette variant within the light and dark
  families.
- **Storage** — where your calendar lives. See [storage.md](storage.md).
- **Developer** — demo data, log capture, build info, the update check, and
  the device's own geometry (visible in developer mode). The **Device** block
  prints the viewport, the four safe-area insets in CSS order
  (top / right / bottom / left), the gutter a view's last row is getting, and
  the display mode — the numbers to quote when a layout looks wrong on a
  phone.
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

### Month cell layout

**Settings → Calendar → Month view** shows a sample day with all four pieces
on it. Tap any of its four corners and pick which piece goes there — the
sample rearranges itself immediately, and so does the calendar behind the
dialog. The defaults reproduce a printed wall calendar: the date large in the
**top-right** corner, the holiday name and the day's names stacked in the
**bottom-right** one (holiday first), and your note filling the space between.

- **Day number**, **Holiday name** and **Name days** each live in one of the
  four corners; pieces sharing a corner stack in that order.
- The day number **floats**, so a caption sharing its corner's band flows
  around it — a short name sits beside the number, a long one drops under it.
- **Your note** has no corner: it takes the room the corners leave, and its
  own control puts it at the top of that space, centred in it, or at the
  bottom.

Captions wrap rather than truncate, and a name is only broken across lines
when it cannot fit one whole: "Elsa, Isabella" breaks after the comma, while
"Midsommarafton" breaks at a syllable boundary with a hyphen.

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
The sample day in the section above is drawn as a passed day, so the mark you
pick is previewed there as well as on the calendar behind the dialog.

### Type

A printed calendar doesn't set its whole page in one font, and neither does
this one. **Settings → Calendar → Type** picks a face for each part of a day
independently, previewed in the face itself:

- **Day number** — the date. Defaults to **Almanac**, the bookish serif a
  printed calendar sets its dates in.
- **Holiday name** and **Name days** — the almanac's captions. Both default
  to **Mono**, the app's own font.
- **Your text** — what you write on a day. Also **Mono** by default.

The five faces are **Almanac** (system serifs, no download), **Mono**,
**Sans**, **Serif** and **Dyslexic** (OpenDyslexic). Everything else — the
month title, the weekday headers, the app's own buttons and dialogs — keeps
the app font, so changing a face restyles the calendar rather than the
program around it.

A month cell is only 47 px wide, so the caption sizes there are measured
rather than chosen: a face wider than the default gives the difference back
automatically, and the longest name day still holds a full line instead of
being clipped. That measurement is the size each caption _ships_ at — see
[Text size](#text-size) to change it.

### Text size

**Settings → Calendar → Text size** is one slider per part of a day. All five
read the same way: left is smaller, right is bigger, and the calendar behind
the dialog re-sets itself as you drag.

**Your text** — what you write on a day — has its own ladder, because it is
sized against the room a view actually leaves it rather than against a fixed
size:

- **Dynamic** (the default, the slider's left end) — a note shrinks as you
  write, so it always fits the room the day has left over after its number,
  holiday and name days. Once it is as small as that view allows, the day is
  full: the next keystroke is refused rather than pushed out of sight.
  Deleting always works.
- **Small / Medium / Large** — the text stays at that size no matter how much
  you write, and the day fills up sooner because it never shrinks. Each step
  is scaled to the view it renders in, so a month cell stays legible while the
  roomier week planner uses its extra space.

A note that no longer fits — because you pinned a bigger step, or because it
was written in a view with more room — is cut off at the last line that fits
and ends in an ellipsis, so it stops short of the day's captions instead of
running under them.

The **day number**, **holiday name**, **name days** and **week number** are
the almanac's own printing, and their sliders read as percentages of the size
each was measured at. **100%** is that measurement — the middle stop, and
what a fresh install uses — with two steps down to 80% and three up to 140%.

The sizes apply in all three views at once, each scaled from what that view
prints the piece at, so making the date bigger does not turn the month grid
into the day list. In the month view the captions have only a 47 px column to
sit in, so past 100% names start breaking across two lines — the calendar
re-picks its hyphenation points for the size you chose, so a long name breaks
at a syllable rather than being clipped. The week planner has the opposite
freedom: its date lane widens with the holiday and name-day sliders, so bigger
captions keep the same number of lines and the note beside them gives up the
width instead.

## Install as an app

The calendar is an installable PWA: use your browser's "Install app" /
"Add to Home Screen". It works offline; when a new version is deployed the
app shows a small "a new version is ready" prompt — nothing updates under
your feet mid-edit.
