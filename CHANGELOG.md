# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Released sections below are **generated at release time from the changeset
fragments** in `.changes/unreleased/` — add a fragment per user-visible change
(see `AGENTS.md` → "Releases and changelog"). Do not edit released sections by
hand, and do not write entries here directly: the pending ones live in
`.changes/unreleased/` until a release collates them.

## [Unreleased]

## [0.2.0] - 2026-10-18

### Added

- **The calendar** — A wall calendar in three views — month grid, week planner and day list — with
  week numbers, red Sundays and name days (UK and Sweden), a short note on any
  day you click, and your choice of where it is kept: this browser, a folder on
  your device, Dropbox.
- **Fixed entry text sizes** — Settings → Entries can now pin the text you write on a day at small, medium or large instead of letting it shrink to fit.
- **Swipe between periods** — Every view pages with a swipe up or down — down for the period before, up for the one after — the neighbouring period following your finger and settling into place.
- **Holidays and vacation planner** — Tap a holiday's name in any view to see the year's public holidays and a planner that works out which days to take for the most time off. [Learn more](feature:vacation-planner)
- **Vacation days setting** — Settings → General now takes your yearly vacation allowance, defaulting to 25 days, which the vacation planner spends.
- **Arrange the day cell** — Settings → Calendar lays out a month cell on a sample day: tap a corner to
  choose whether the date, the holiday name or the day's names sit there, and
  where your note starts.
- **A face per part of a day** — Settings → Calendar now sets the day number, the holiday, the day's names and
  your own text in a face each — the printed almanac serif, mono, sans, serif or
  OpenDyslexic.
- **Pinned month heading in the day list** — The month heading and its arrows stay at the top of the day list while you
  scroll, so the month you are reading is always on screen.
- **Name-day list and search** — Tap a name in the calendar to browse the almanac alphabetically and search it by how a name sounds, so "Nicklas" finds Niklas and "Sophia" finds Sofia. [Learn more](feature:name-days)
- **Vacation planner shortcut** — Settings → General → Vacation now has an **Open the vacation planner** button, so the planner is reachable without knowing to tap a holiday's name. [Learn more](feature:vacation-planner)
- **Holiday eves** — The country calendar now knows which holiday eves you actually work — Julafton, Midsommarafton and Nyårsafton default to days off as most collective agreements have them, and Settings → Calendar → Holiday eves lets you set any of the seven Swedish eves to a day off, a half day or a working day. [Learn more](feature:locales)
- **Cross off the days that have passed** — Settings → Calendar → Passed days draws a cross (✕) or a single slash (/)
  over every day before today, across the whole day or over its date alone —
  off until you turn it on.
- **Device geometry in the Developer tab** — Settings → Developer now prints the viewport, the four safe-area insets, the
  gutter a view's last row is getting and the display mode, so a layout report
  from a phone can name the numbers instead of describing them.
- **Several calendars** — Keep several separate calendars in one app — one for home, one for work —
  each with its own notes in the same storage backend, switched from the new
  button at the top left. [Learn more](feature:calendars)
- **Dropbox storage** — Keep your calendar in Dropbox: each calendar gets its own folder in the
  `nird-calendar` app folder, and Settings → Storage shows you exactly where it
  sits.
- **Heading colour** — Settings → Calendar → Heading bands the month heading in one of five print colours and prints the week planner's week numbers in the same ink.
- **Day of year in the day list** — Settings → Calendar → Week planner → Day of year now prints each day's number
  in the year in the day list too, not only in the week planner.
- **Import and export** — Settings → Storage now exports your settings and every calendar with its notes to one file, and imports one back as a merge — adding what this device is missing and asking you which side wins only where the two disagree.
- **Hold a day up close** — Press and hold any day, in any view, to open it as a page of its own — the whole note at about four times the size a month cell can hold it at, wrapping properly, and a comfortable place to write a long one.
- **Notes may use the whole row** — A new setting (Settings → Calendar → View, on the week planner or the day
  list) lets a note run beside the date and the week number and then across the
  row's full width underneath them, for about half again the room to write in —
  off by default, so the two margins keep a straight edge of their own down the
  strip unless you ask otherwise.
- **Reset the calendar** — Settings → Storage can now empty a calendar — or every calendar at once — removing all your notes and nothing else, after a confirmation that names the calendar and counts what is about to go.
- **Swipe between views** — A swipe left or right turns the calendar from the month grid to the week planner to the day list and back, at the period you are already reading, with the view you are turning to following your finger.
- **The week list** — Tapping any week number opens the year's weeks with the dates they span, searchable by week number or by a date written any of the ways people write one — and an ambiguous date like 12/8 is offered both ways round. [Learn more](feature:weeks)
- **An app for your phone, with widgets** — The calendar now ships as an iOS and Android app that carries the whole
  calendar inside it, with four Home Screen widgets — today, the next three
  days, this week, and this week without the days you don't work. [Learn more](feature:native-app)
- **Your people's birthdays and name days** — The App Store and Play app can read your contacts and mark the days they are
  celebrated — their birthday, and the day the almanac celebrates their name,
  matched by how the name sounds so a Nicklas is celebrated on Niklas's day. [Learn more](feature:contacts)
- **Privacy policy** — The calendar now has a privacy policy at
  [/privacy](https://calendar.niclaslindstedt.se/privacy/), linked from
  Settings → General, spelling out what stays on your device, what the optional
  sync backends carry, and what the app never sends anywhere.
- **Five new country calendars and five new languages** — Germany, France, the Netherlands, Norway and Finland join Sweden and the UK — each with its own holidays, holiday eves and week conventions, Norwegian and Finnish with their full name-day almanacs — and the app now reads in Deutsch, Français, Nederlands, Norsk and Suomi as well as English and Svenska. [Learn more](feature:locales)
- **Arrows to turn the page on a desktop** — The month heading grows a pair of ⌃ ⌄ arrows on a device with a mouse, so the calendar can be paged in every view without the swipe a desktop browser has no way to make.
- **Calendar on the desktop** — Calendar now has a desktop download for Windows, macOS and Linux, attached to every release. It is the same app with a window around it, it needs no network, and it keeps its own notes on your machine. [Learn more](feature:desktop-app)
- **Dropbox in the desktop app** — The desktop app can now connect Dropbox: signing in opens your usual browser, and the app picks up the result once you approve. [Learn more](feature:desktop-app)
- **Sync through iCloud Drive** — On iPhone and iPad, Settings → Storage offers iCloud Drive — one tap, no account to create, and your calendars follow you between your Apple devices in a folder you can open in Files. [Learn more](feature:native-app)
- **A United States calendar** — An American device now opens on a United States calendar — weeks from Sunday, the federal holidays with their observed weekdays for the vacation planner, US week numbers when you turn them on, and dates written "Dec 25" — where it used to fall back to the United Kingdom's. [Learn more](feature:locales)

### Changed

- **A home of its own** — Calendar now lives at [calendar.niclaslindstedt.se](https://calendar.niclaslindstedt.se),
  with the in-development build alongside it at `/preview/` — a separate install,
  so trying the next version never disturbs the one on your home screen.
- **Redesigned Settings** — Settings is now a tabbed dialog with a section rail (a burger menu on phones) whose look changes preview live behind it and are kept with Save or dropped with Cancel.
- **Roomier top menu on a phone** — The ‹ › period arrows moved from the top menu onto the month heading, giving the view switcher room to breathe in portrait, and the menu now follows the sibling notes app's header look with matching top and bottom breathing room.
- **Defaults that follow your device** — A fresh install now picks the country calendar from your device's language settings and starts on the System theme, so a phone in dark mode opens a dark calendar. [Learn more](feature:locales)
- **Month and week fill one screen** — The month grid and week planner now fit the screen exactly instead of scrolling, so a period is always shown whole.
- **Tighter week-number column** — The month view's week numbers drop their "v."/"w." prefix and sit in a column sized to the digits, giving every day cell more room for name days and notes.
- **A new app icon** — The installed app now wears the same mark as its siblings — a stylised green
  calendar page with hanger pins, a header band and a grid of day cells with one
  marked day, on a near-black tile — in the browser tab, on your home screen and
  on the link preview.
- **The day list opens where a week starts** — Opening the day list on the current month now takes the week's rule up behind
  the month heading, so today's week starts flush under the band instead of a
  few pixels below a stray red line.
- **A little more air under each rule** — The day list and the week planner leave two more pixels between a row's rule
  and the date under it, so a day reads as its own line rather than as a number
  pressed against the line above it.
- **The month view reads like a printed calendar** — Each day now carries its date large in the top-right corner, with the holiday
  name and the day's names stacked in the bottom-right one, leaving the middle
  of the cell free to write in.
- **Flags in the language and country pickers** — The interface language is now picked from two flagged buttons, and every
  country in the country-calendar list leads with its flag.
- **Swipe in every view** — The day list pages between months with a swipe like the other views — carrying
  on into the month above or below once the days have scrolled out — the
  holidays screen keeps its header still while only the year's list moves, and
  the month and week views no longer scroll at all, so a swipe is never lost to
  a bounce.
- **Appearance is just the theme** — The Appearance tab is now the theme alone; the calendar's typography moved to
  Settings → Calendar and the unused widget-kit knobs are gone.
- **Tighter day-list week numbers** — The day list's week number sits in a narrower lane with half the space on either side of it, giving each row more width for your own text.
- **Strip heading and week rule** — On a phone the week planner's and day list's coloured heading now runs the full width of the screen, and the day list draws its week rule in the heading's colour, a little lighter than before.
- **Type that grows with the screen** — Every printed size was a measurement taken on a portrait phone and was handed
  unchanged to a desk monitor, so a 1440p screen drew a month cell seven times
  as wide and still set its name days at 9 px — the calendar now scales its type
  to the room the window actually has, up to twice the measured size, with a
  phone unchanged in either orientation.
- **Text-size steps you can tell apart** — Settings → Calendar → View spread its Small / Medium / Large steps apart —
  Large is now half again the measured size rather than a quarter, and the
  pinned sizes for your own writing take most of the room a view has instead of
  huddling at the bottom of it.
- **Notes size themselves to the day** — Pressing a day drops a caret straight into it with no placeholder, the text
  shrinks as you write until the day is genuinely full and then takes no more,
  the fixed text sizes are a step smaller across the board, and a note too long
  for the space it is shown in now ends in an ellipsis instead of running under
  the holiday and name-day captions.
- **Text size for every part of a day** — Settings → Calendar → Text size is now one row per part of a day — your own text, the date, a holiday's name, the name days and the week number — each set with Small / Medium / Large buttons and previewed by a sample printed beside them.
- **A date lane in the week planner** — The week planner now sets each day's date big at the head of a lane down the
  left, with the weekday, the holiday and the day's names stacked under it, and
  leaves the whole rest of the row to write in.
- **Back to today** — The Today button is gone: pressing the view you are already in returns to the
  current day, which frees the top left for the calendar switcher.
- **Enter writes a new line** — Pressing Enter in a day's note now starts a new line instead of closing the
  editor — Esc, Ctrl/⌘+Enter or clicking away puts the pen down.
- **Week planner** — The week view is now a printed column-calendar strip — the date and the day's names at the head of each row, the week number and the holiday in the right-hand margin, a doubled rule where the week changes — with new settings for the date's size, how the week number is phrased, the day's number in the year, and letting rows grow with what you write.
- **Day list** — The day list now prints a day the way the week planner does — the full weekday beside the date with the day's names under it, the week number and the holiday's name in the right-hand margin, and a doubled rule wherever the week changes.
- **Text, faces and layout are set per view** — Settings → Calendar → View now asks how a day is printed one view at a time —
  pick Month, Week or Day list, tap a quadrant of the live sample to choose what
  sits there, and set each piece's face and size beneath it (the week planner and
  the day list share one answer, since they print the same row).
- **A fresh calendar opens as a printed one** — New installs now start light, in the Almanac face throughout, with the month
  heading banded in print red, week numbers spelled out in the strip views, and a
  passed day crossed over its date alone — every one of them still a setting.
- **Switching view goes to today** — Every press of the view switcher now lands on the current day — pressing a
  different view no longer carries the period you had browsed away to across the
  switch.
- **The day list opens at this week** — The day list now puts the current month's scroll at the week you are in rather
  than at its 1st, so going to today in that view lands on today instead of
  somewhere above it.
- **Air under the month heading** — Every view now leaves a gap between the heading's colour band and the first row under it — the week planner and the day list printed their first day flush against it — and the gap grows with the screen the way the rows around it do.
- **Rules that reach the edge of the phone** — On a phone the week planner's and the day list's rules, and the day you are on, now run the full width of the screen with the date and the week number a little further into the margins, the month heading is banded edge to edge like the other two views, and the rule under its weekday names reaches across the week-number gutter.
- **One masthead for all three views** — The week planner and the day list now head the month in the same wall-calendar caps the month grid uses, and the title came down a size so that even September fits between the arrows on a phone.
- **A note is laid out as you type it** — In the week planner and the day list, what you write is now laid out in the
  shape it will be read in while you are still typing it, rather than reflowing
  once you put the pen down.
- **Notes start beside the date in the month view** — A note at the top of a month cell now flows around the day number, so on a
  screen whose cells have room for it — a tablet, a desk monitor — your text
  starts on the same line as the date instead of under it.
- **The day list turns the page like a calendar** — Paging the day list now lands at the end you came in through — the 1st going
  forward, the last day going back, today's month included — so the days run
  unbroken across the join instead of dropping you into the middle of the month
  you turned to.
- **Bigger text sizes** — The calendar's size steps have moved up a rung — what was Medium is now Small, what was Large is now Medium and is what a fresh install prints at, and the new Large is twice the measured size, for a tablet or a desk screen rather than a phone.
- **More room under the calendar** — Every view now leaves a wider visible margin below its last row, so the month
  grid's closing rule reads as the end of the calendar rather than sitting on the
  home indicator of an installed phone.
- **Shorter app title** — The browser tab, the share previews and the installed app are now simply called "Calendar" instead of carrying the tagline.
- **The Dropbox folder is named for the app** — The app folder on Dropbox is now `Apps/calendar` rather than
  `Apps/nird-calendar`, and exported backups are marked `calendar-backup`.
  Backups written under the old name still import — a file on your disk does not
  stop being yours because the app changed what it calls itself.
- **A signed and notarized Mac download** — The macOS desktop app can now be signed with a Developer ID and notarized by Apple, so it opens like any other app instead of asking you to allow it in System Settings first. Each release's notes say whether its Mac download is notarized.
- **A new demo calendar** — Settings → Developer → Demo data now shows one person's year — an on-call rotation, a conference talk, Thursday climbing and a half marathon — with every note placed around the current week, so the demo never looks out of date.
- **US spelling and word choices** — The calendar's English is US English now — "Color", "canceled" — and your notes and settings load exactly as before.
  
  It uses American words too: you check the contacts the calendar marks rather than tick them, the vacation allowance is your paid time off, and the planner tells you which days to take rather than book.
- **The website asks search engines not to index it** — People should find Calendar through its App Store page and apps.agilator.se, so every page of calendar.niclaslindstedt.se now carries a `noindex` robots tag, and the sitemap, structured data and `llms.txt` are gone.
- **The phone app calls itself by its store name** — Inside the App Store app, the privacy page and the page title use the name under its icon; the website and the desktop app keep "Calendar".

### Fixed

- **Top menu spacing in the installed iOS app** — The installed iOS app no longer stacks the top menu's padding on top of the
  status-bar inset, so the gap above the buttons matches the gap below them
  instead of reading as double it.
- **Day-list left margin** — The day list no longer reserves an empty week-number gutter when week numbers are off, and every view now keeps a consistent gap below its last row clear of the phone's home indicator.
- **Readable name days in the month view** — Name days and holiday names now flow around the date in the month view instead of being truncated to "B…", so a short name sits beside the number, a long one drops below it, and no name is ever split mid-word.
- **Names break at syllable boundaries** — A name or holiday too long for a month cell's line is now hyphenated where the language allows it ("Henri-etta") instead of being split against whatever space was left.
- **Names break where they should** — A pair of name days now breaks after the comma instead of being hyphenated
  mid-name, and the day list wraps the holiday and names instead of cutting them
  off with an ellipsis.
- **Swipes survive a sideways drift** — A page swipe now follows through even when the finger drifts across it before
  lifting — once a swipe starts, only its travel along the paging axis counts.
- **Edge-to-edge on iOS** — The installed app now paints all the way up under the iOS status bar instead
  of leaving an opaque bar above the top menu.
- **Room below the last row** — Every view now leaves a clear 10 px below its last row instead of spending the
  whole gutter on the home indicator, so the bottom week no longer sits against
  the swipe bar in the installed iOS app.
- **Dark status bar on iOS** — The installed app's status-bar band now takes the theme's own background
  instead of rendering as a pale strip above the top menu.
- **The app no longer rides up under the status bar** — Closing Settings while a text field was focused could leave the whole app
  shifted up behind the iOS Dynamic Island until it was relaunched; it now
  settles back on its own.
- **Day list bottom margin** — The day list now leaves a clear gap under the last day of the month, so the final row can be scrolled fully into view on a phone instead of sitting against the bottom edge.
- **Paging the day list starts at the top** — Swiping or paging to another month in the day list — and to another year in the holidays screen — now lands at the top of the new list instead of carrying over the scroll position of the one you left.
- **Week numbers crossing the month grid's rules** — The month grid's week-number gutter was a flat 20 px measured at the number's
  own 10 px, so on a bigger screen — where the number is set larger — it ran
  past its own column and drew through the first day column's rule; the lane now
  carries the same two factors the digits in it do.
- **Top and bottom margins on the installed iOS app** — The installed app now leaves the same breathing room over the top menu's
  buttons as under them, and every view's last row keeps a clear margin above
  the home indicator instead of running off the bottom of the screen.
- **Month switching and scrolling are smooth** — Turning to another period no longer stutters: a swipe now follows your finger
  without re-rendering the calendar behind it, the page turn itself runs entirely
  on the compositor, and tapping a day redraws that day instead of every day of
  three months.
- **A second tap on the period arrow is not lost** — Tapping the ‹ or › arrow again while the previous page turn is still animating
  now takes you one period further instead of being ignored.
- **The last row clears the home indicator** — The month grid's bottom week and the week planner's Sunday no longer sit under
  the home indicator on an installed iOS PWA: the gutter under a view's last row
  now clears the indicator's band whether or not the device reports it, and
  leaves 16 px of visible margin below the last row on every device.
- **One press to get back to today** — Pressing the view you are already in now returns to today on the first press —
  a flick to the next month no longer leaves the top menu needing a second tap,
  and a press while the day list is scrolled away puts it back at today's month.
- **Cross over a week-planner date** — The cross over a passed day's date in the week planner ran the full width of the almanac lane instead of sitting over the digits.
- **Heading band** — The coloured heading band is now exactly as wide as the calendar under it, and drops the hairline that used to sit immediately below it.
- **Room for a two-digit date** — The week planner and the day list now measure the date's column from the face
  and size the day number is actually set in, so a two-digit date no longer runs
  into the weekday beside it — and the weekday and name-day columns stay in one
  straight line whether the day is the 5th or the 25th.
- **The weekday no longer floats above the date** — In the week planner and the day list the weekday's name sat above the top of
  the date beside it, drifting further the larger the date was set; the two are
  now aligned on their capitals.
- **A crossed-off date is drawn over the digits** — The mark over a passed day's date now covers the number itself rather than its
  whole line box, so it no longer runs up against the rule above it in the week
  planner.
- **One rule where a week starts** — The day list no longer draws its own hairline immediately above the heavier rule that opens a week, which read as a smudged double line.
- **Bottom gutter on the holidays screen** — The holiday list and the vacation planner now leave the same gap under their
  last row as the calendar's own views, so the final holiday or break is no
  longer flush against the bottom edge of the screen.
- **The last row and the top menu on an installed iOS app** — The installed app now clears the home indicator with the whole band plus a
  wider margin below every view's last row, and spends the status-bar band as
  the space over the top menu's buttons rather than stacking padding on top of
  it.
- **The week's rule stays behind the masthead** — With the period arrows off the month heading stood a few pixels shorter than
  the day list scrolled by, so the week the list opens on came to rest with its
  red rule stranded just below the band instead of tucked behind it.
- **The first day of the week sits on the band** — The week planner gave the first day more air under the heading's colour band
  than the six days below it get under their own rules; the band is now the
  first row's rule, so all seven are spaced alike.
- **Off-screen months are out of the way** — The two periods parked either side of the one on screen were never actually
  made inert, so their day cells sat in the tab order and were read out as part
  of the page.
- **The day list's first row sits on the heading too** — The day list left air under the month's heading, so the 1st of a month you
  paged to floated half a row lower than the day the month you are living in
  opens on; the heading is now that first row's rule, as it already is in the
  week planner.
- **Day-list names are never cut off** — A day list row now grows with the size the day's names are set at, so a three-name day no longer has its second line sliced through the middle of the letters.
- **Type sized to the screen it is on** — The calendar no longer sets a laptop as large as a wall-sized display: how
  much the type grows with the screen is now measured on a real desk screen, so
  a MacBook, a 1440p monitor and a 4K each get their own size instead of sharing
  one that was too big for all but the largest of them.
- **The privacy policy covers the app as well as the website** — The policy said the app is served by GitHub Pages. That is true of the website; the App Store and Google Play app serves its own copy on the device and sends no such request. The policy now says both, and links to the one the store listing uses.
- **Top menu spacing wherever the page runs under the status bar** — The top menu now takes the larger of its own padding and the status-bar inset, rather than stacking the one on the other everywhere but the installed iOS PWA. The App Store build, which runs the page edge to edge, gets the same even gap above and below the buttons as the installed app.
- **The iOS app fills the screen edge to edge** — The App Store build framed the page inside the safe area, leaving flat bands above and below it, so the top menu stopped short of the status bar and the calendar short of the home indicator. The page now runs full-bleed on iOS and pads itself around the notch and home indicator exactly as the installed PWA does. [Learn more](feature:native-app)
- **A long hold on a day no longer opens it for typing too** — Pressing and holding a day opens it as a page however long the finger stays down; before, a hold past about a second also opened the day's editor behind it.
- **Export works in the phone app** — Export opens the share sheet with the backup file, to save to Files or send on; before, the download it started went nowhere inside the app.
- **The iOS status bar stays readable on every theme** — The clock and battery took their colour from the phone's light or dark setting rather than the app's theme, so a dark theme on a phone in light mode drew dark icons on a dark background, and a light theme in dark mode the reverse. Now that the page runs under the status bar, its icons follow the theme the app shows — light on a dark theme, dark on a light one — and switch with it. [Learn more](feature:native-app)
- **The phone app carries no service worker** — Its bundled page is built as a shell build, like the desktop app's: no service worker and no "reload to apply" prompt, since the app changes only when a new version ships from the store. The bundle script now refuses a page that still holds one.

### Removed

- **Google Drive sync** — Google Drive is no longer one of the places a calendar can be kept. Browser
  storage, a folder you pick, and Dropbox remain.
  
  If you had Drive selected, the calendar moves to browser storage and brings
  the last synced copy with it, so it opens on your notes rather than on an
  empty month. The file itself stays in your own Drive folder, where you can
  read, export or delete it as you would any other file — nothing is removed
  from your account.
- **No link to the source in the apps** — The phone and desktop apps' privacy page no longer links to the project's GitHub issues or names its web address; it points to the support page at apps.agilator.se instead. The website keeps its links.
- **No Dropbox in the phone app** — The iPhone and Android app no longer offers Dropbox: it keeps your calendars on the device or, on iPhone and iPad, in your own iCloud Drive — the website and the desktop app keep Dropbox as before.

