# The native app, and its widgets

The calendar is a PWA first: open
[calendar.niclaslindstedt.se](https://calendar.niclaslindstedt.se), install it
from the browser, and you have the whole app offline with nothing downloaded
from a store.

The native app exists for the one thing that route cannot give you: **widgets
on the Home Screen.** Everything else is the same app — the same three views,
the same notes, the same storage backends — running inside a wrapper thin
enough that it adds no behaviour of its own.

## What the app is

The wrapper carries a copy of the web app inside itself and serves it from a
loopback address on your phone. So:

- it works with **no network at all**, like the installed PWA;
- it updates when you update the app from the store, and not before;
- its notes live in exactly the same place the browser's would — the app's own
  storage on the device — and the storage backend you pick in
  **Settings → Storage** works the same way, Dropbox and Drive included.

Links that leave the app (a Dropbox sign-in, a URL you wrote in a note) open in
your normal browser rather than inside the app, which is both what the stores
expect and what the sign-in pages require.

## The widgets

All of them are **read-only**: a widget shows you what you wrote, and tapping
it opens the app on that calendar. Nothing is edited from the Home Screen.

### iOS

| Widget       | Sizes         | Shows                                                |
| ------------ | ------------- | ---------------------------------------------------- |
| **Today**    | small, medium | The day of the month, the weekday, and today's note. |
| **Upcoming** | medium, large | The next days you have written something on.         |

Add them the usual way: long-press the Home Screen → **+** → search for
_Calendar_.

### Android

| Widget       | Sizes     | Shows                                        |
| ------------ | --------- | -------------------------------------------- |
| **Upcoming** | resizable | The next days you have written something on. |

Long-press the Home Screen → **Widgets** → _Calendar_.

## What a widget shows, and what it doesn't

A widget prints **the date and your note**. It does not print name days,
holidays or week numbers — those come from the country packs the app computes
per year (see [Locale packs](locales.md)), and duplicating that arithmetic
inside a widget would be a second, silently-drifting copy of the calendar. The
full month, with all of it, is one tap away.

A widget follows:

- **the calendar you have open in the app** — switch calendars and the widgets
  follow, taking that calendar's name and its colour with them;
- **your theme** — the widget is painted in the same colours the app resolved,
  so it matches whatever preset you picked;
- **your country pack** — weekday names are printed in it, not in the phone's
  language.

## When a widget updates

Within a few seconds of a note changing, and again when the date rolls over.
There is one lag worth knowing about: the widget reads a copy the app leaves
for it, and **the app has to have been opened at least once** since you
installed it before there is anything to read. A widget added before that first
launch shows an empty calendar until you open the app.

Notes that a _different device_ wrote reach the widget the same way they reach
the app — through your storage backend, the next time the app syncs. A widget
does not sync on its own.

## Which days it covers

The widgets are handed the notes from **yesterday** through the **next 60
days**. Yesterday is in so the widget still finds "today" if it renders just
after midnight; sixty days ahead is far past anything an "upcoming" list would
show. Anything further out is in the app.

## Building and releasing it

See [`native/README.md`](../../native/README.md) for the layout and
[`native/RELEASING.md`](../../native/RELEASING.md) for the build and store
process.
