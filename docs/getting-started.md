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
  day's name days beside the number. In Settings → Entries you can choose
  whether rows keep a fixed height or grow with their text.

The **‹ ›** arrows flanking the month heading page between months (or weeks,
in the week view); **Today** in the top bar jumps back to the current day.
The arrows sit on the heading rather than in the top bar so the view switcher
has room on a portrait phone.

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
  settings; changing it here pins your choice.
- **Appearance** — themes (light/dark/custom), font, UI text size, density.
  A fresh install starts on **System**, which follows your device's light /
  dark preference until you pick a concrete theme.
- **Entries** — how your day text is sized, and the day-list row height.
- **Storage** — where your calendar lives. See [storage.md](storage.md).
- **Developer** — demo data, log capture, build info, update check (visible
  in developer mode).
- **Logs** — the in-app log (visible once log capture is on).

### Entry text size

**Settings → Entries → Text size** chooses how the text you write on a day is
sized:

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
