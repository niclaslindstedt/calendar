# Calendars

A calendar is a whole separate set of notes. Same country pack, same theme,
same storage backend — its own days. Keep one for home and one for work, or
one per household, and the text you write in one never shows up in the other.

## Switching

The button at the **top left** — where **Today** used to be — carries the
active calendar's icon in its colour, so which calendar you are writing in is
visible without opening anything. Tap it for the list; tap a name to switch.
The month on screen stays put, only the notes change.

> Going back to today moved onto the view switcher: **press the view you are
> already in** (Month while in Month, Week while in Week) and the calendar
> returns to the current day. Pressing a _different_ view switches to it and
> keeps the period you were reading.

## Managing

**Manage calendars…** at the foot of that menu opens the dialog: create one,
rename it, give it an icon and an accent colour, or delete it. The icon and
colour are what the top-left button shows, and — when a calendar picks an
icon — what the browser tab's favicon becomes, so a pinned work calendar and a
personal one are told apart in the tab strip.

The first one is the **default** calendar. It cannot be deleted, and it is the
calendar you already had: everything written before there were several is in
it, unmoved.

Deleting a calendar deletes its notes. The app clears the device's copy and
empties its document in the active backend — on Dropbox, where a calendar is a
folder, the folder goes with it. Either way a calendar re-created under the
same name starts blank rather than inheriting the deleted one's notes.

## Where they are stored

Every calendar is a separate document in the **same** backend
(Settings → Storage) — one connection, one folder, several files:

| Backend      | Default calendar        | Any other calendar         |
| ------------ | ----------------------- | -------------------------- |
| This browser | `calendar:document`     | `calendar:document:<slug>` |
| Local folder | `calendar.json`         | `calendar.<slug>.json`     |
| Dropbox      | `default/calendar.json` | `<slug>/calendar.json`     |
| Google Drive | `calendar.json`         | `calendar.<slug>.json`     |

Dropbox is the one backend where a calendar is a **folder** rather than a file
name: `Apps/nird-calendar/<slug>/calendar.json`, one folder per calendar at
the app folder's root, the default calendar included. Settings → Storage
prints the path of the calendar you're in.

The `<slug>` is derived from the name you typed when you created the calendar,
and is fixed from then on — renaming changes the display name, not where the
notes live.

The list of calendars and which one is active are **device-local** (the
`calendar:calendars` and `calendar:calendar:active` keys in `localStorage`).
The documents sync through whichever backend you chose; the registry does not,
so a second device pointed at the same Dropbox app folder needs its calendars
created there too — under the same names, which produce the same slugs (and
therefore the same folders), and the notes line up.

> The feature was called **namespaces** before it was released, and its
> registry lived under `calendar:namespaces` and `calendar:namespace:active`.
> A device that still has those keys is carried onto the names above the first
> time it loads the app — the calendars themselves never moved, so nothing has
> to be re-created.

## Settings are shared

Country, language, theme, fonts, text sizes, the storage backend and its
connection are one set of choices for the app, not per calendar. Only the
notes differ.
