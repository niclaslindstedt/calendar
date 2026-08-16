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
  day's name days beside the number. In Settings you can choose whether rows
  keep a fixed height or grow with their text.

The arrows and **Today** in the top bar page between months (or weeks, in the
week view).

## Settings (the cogwheel, top right)

- **General** — UI language (English / Svenska), the country calendar
  (United Kingdom / Sverige — sets start of week, week numbers, red days,
  name days), display toggles, and the day-list row mode.
- **Appearance** — themes (light/dark/custom), font, text size, density.
- **Storage** — where your calendar lives. See [storage.md](storage.md).
- **Developer** — developer mode, demo data, log capture, build info.
- **Logs** — the in-app log (visible in developer mode).

## Install as an app

The calendar is an installable PWA: use your browser's "Install app" /
"Add to Home Screen". It works offline; when a new version is deployed the
app shows a small "a new version is ready" prompt — nothing updates under
your feet mid-edit.
