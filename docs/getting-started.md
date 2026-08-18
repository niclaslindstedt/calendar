# Getting started

Calendar is a wall calendar you glance at — not a reminder machine. This page
walks through the first five minutes.

## Open the app

Run it locally (`npm run dev`) or open the deployed app. You land on the
current month in the **month grid**: weekday headers, the days of the month,
and — depending on the country setting — week numbers in the margin and name
days in each cell. Sundays are red, like on paper.

## Write on a date

Click any date and type: `Dinner Ada 18:00`. The text lands on the calendar
as you type and is saved automatically. Enter or Esc (or clicking elsewhere)
puts the pen down. There are no times, alarms, or notifications — the note is
meant to be **read by you** the next time you look at the calendar.

Keep notes short: the text shrinks as it grows so it always fits its cell.
If you routinely need more room, use the week planner or the day list.

## The three views

The switcher in the top bar toggles:

- **Month** — the whole month, one screen, wall-calendar style. When a month
  image pack is installed, the artwork hangs above the grid.
- **Week** — one week at a time, one generous row per weekday, with more room
  to read and write.
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
- **Calendar** — the month cell's layout (arranged on a sample day: tap a
  corner and pick what belongs in it), the day-list row height, and the face
  each part of a day is set in. See [Month cell layout](#month-cell-layout)
  and [Type](#type).
- **Appearance** — the theme, and only the theme: **Follow device** (the
  default, which tracks your device's light / dark preference), **Light**,
  **Dark**, or **Custom**, plus the palette variant within the light and dark
  families.
- **Storage** — where your calendar lives. See [storage.md](storage.md).
- **Developer** — demo data, log capture, build info, update check (visible
  in developer mode).
- **Logs** — the in-app log (visible once log capture is on).

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
being clipped.

### Entry text size

**Settings → Calendar → Your text → Text size** chooses how the text you
write on a day is sized:

- **Dynamic** (the default) — a note shrinks as you write, so it always fits
  its day instead of clipping.
- **Small / Medium / Large** — the text stays at that size no matter how much
  you write; a long note is clipped by its cell rather than shrunk. Each step
  is scaled to the view it renders in, so a month cell stays legible while the
  roomier week planner uses its extra space.

## Install as an app

The calendar is an installable PWA: use your browser's "Install app" /
"Add to Home Screen". It works offline; when a new version is deployed the
app shows a small "a new version is ready" prompt — nothing updates under
your feet mid-edit.
