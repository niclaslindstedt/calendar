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
it opens the app. Nothing is edited from the Home Screen.

Every one is the same idea — **a span of days, each printed whether or not you
wrote on it.** They differ only in how long that span is:

| Widget          | Days                                      | iOS sizes | Android |
| --------------- | ----------------------------------------- | --------- | ------- |
| **Today**       | Today.                                    | S, M      | ✓       |
| **Next 3 days** | Today and the two days after it.          | S, M      | ✓       |
| **This week**   | Every day of the week you are in.         | S, M, L   | ✓       |
| **Work week**   | That week, minus the days you don't work. | S, M, L   | ✓       |

Empty days are shown, not skipped. A week with two things in it should look
like a week with two things in it — that is what makes these calendar widgets
rather than to-do lists. Today's row is tinted and its date picked out in your
calendar's colour, so it is findable at a glance.

**iOS**: long-press the Home Screen → **+** → search for _Calendar_.
**Android**: long-press the Home Screen → **Widgets** → _Calendar_.

### Whole week or work week

These are **two separate widgets** rather than one with a setting, so you pick
which you want when you add it. Changing your mind means removing one and
adding the other — the trade for that is that both work on every phone the app
runs on, with no per-widget configuration screen to go and find.

Which days count as work days comes from your **country pack**, not from a
fixed Monday–Friday: both the UK and Sweden rest on Saturday and Sunday, and a
country pack added later brings its own answer with it. The week also starts
where your pack says it starts, not where the phone's language would put it —
so a Swedish calendar on an American phone still begins its weeks on Monday.

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

The widgets are handed the notes from **a week back** through the **next 60
days**. A week back, because on a Sunday the week you are in began six days
ago and the week widgets have to be able to show it; sixty ahead is far past
anything these spans reach. Anything outside that is in the app.

## Building and releasing it

See [`native/README.md`](../../native/README.md) for the layout and
[`native/RELEASING.md`](../../native/RELEASING.md) for the build and store
process.
