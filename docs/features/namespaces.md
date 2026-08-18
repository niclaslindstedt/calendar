# Namespaces

A namespace is a whole separate calendar. Same country pack, same theme, same
storage backend — its own notes. Keep one for home and one for work, or one
per household, and the text you write in one never shows up in the other.

## Switching

The button at the **top left** — where **Today** used to be — carries the
active namespace's icon in its colour, so which calendar you are writing in is
visible without opening anything. Tap it for the list; tap a name to switch.
The month on screen stays put, only the notes change.

> Going back to today moved onto the view switcher: **press the view you are
> already in** (Month while in Month, Week while in Week) and the calendar
> returns to the current day. Pressing a _different_ view switches to it and
> keeps the period you were reading.

## Managing

**Manage namespaces…** at the foot of that menu opens the dialog: create one,
rename it, give it an icon and an accent colour, or delete it. The icon and
colour are what the top-left button shows, and — when a namespace picks an
icon — what the browser tab's favicon becomes, so a pinned work calendar and a
personal one are told apart in the tab strip.

The first namespace is the **default** one. It cannot be deleted, and it is
the calendar you already had: everything written before namespaces existed is
in it, unmoved.

Deleting a namespace deletes its notes. The app clears the device's copy and
empties its document in the active backend; a namespace re-created under the
same name starts blank rather than inheriting the deleted one's notes.

## Where they are stored

Every namespace is a separate document in the **same** backend
(Settings → Storage) — one connection, one folder, several files:

| Backend      | Default namespace   | Any other namespace        |
| ------------ | ------------------- | -------------------------- |
| This browser | `calendar:document` | `calendar:document:<slug>` |
| Local folder | `calendar.json`     | `calendar.<slug>.json`     |
| Dropbox      | `calendar.json`     | `calendar.<slug>.json`     |
| Google Drive | `calendar.json`     | `calendar.<slug>.json`     |

The `<slug>` is derived from the name you typed when you created the
namespace, and is fixed from then on — renaming changes the display name, not
where the notes live.

The list of namespaces and which one is active are **device-local** (the
`calendar:namespaces` and `calendar:namespace:active` keys in `localStorage`).
The documents sync through whichever backend you chose; the registry does not,
so a second device pointed at the same Dropbox folder needs its namespaces
created there too — under the same names, which produce the same slugs, and
the notes line up.

## Settings are shared

Country, language, theme, fonts, text sizes, the storage backend and its
connection are one set of choices for the app, not per namespace. Only the
notes are namespaced.
