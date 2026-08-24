# Contacts: your people's birthdays and name days

A wall calendar on a kitchen wall is where a household keeps track of who is
being celebrated when. The phone already knows — the birthdays are sitting in
the address book — but the calendar and the address book never speak, so the
dates get copied across by hand once a year and then quietly drift.

This closes that gap: let the calendar read your contacts, tick the people you
want, and their days are marked.

**It is available in the App Store and Google Play app only.** A browser has
no way to read a device's address book, so on
[calendar.niclaslindstedt.se](https://calendar.niclaslindstedt.se) the feature
— and the **Contacts** tab it lives in — is simply not there. See
[The seam](#the-seam) for why that is a capability check rather than a check
for the app.

## What gets marked

Two things, and they are printed differently because they are different kinds
of fact.

A **birthday** is something the calendar did not otherwise know, so it is new
text on the day: the cake glyph and the person's first name, in the theme's
accent colour, in the same slot the day's name days take.

A **name day** is a name the almanac was already printing. So it is not
repeated — the name already on the page is set in the accent colour and
bolded, in place. On 2 August a Swedish calendar prints "Karin, Kajsa"; with
an Anna-Karin in your contacts it prints **Karin**, Kajsa.

Both ride in the slot the view gives the day's names, which means they move
with it: send your name days to the bottom-left corner of a month cell
(Settings → Calendar → View) and the birthdays go there too. It also means a
country with **no** name-day tradition still prints birthdays — a British
calendar has no almanac to switch on, and the birthdays are the whole feature
there.

### The spelling

An almanac prints one spelling per name. The Swedish one prints "Niklas", so a
contact stored as **Nicklas**, **Niclas** or **Nichlas** would match nothing
under a literal comparison — and they are not misspellings, they are the same
name written the way the language allows.

So both sides are folded to what the name _sounds_ like before they are
compared — the same machinery [the name-day search](name-days.md) uses, and
the same per-language rules from the country packs. Christoffer reaches
Kristoffer, Margaretha reaches Margareta, Sofia and Sophia are one name.

The calendar prints **the almanac's** spelling, not the contact's, because
that is the text already on the page. Settings → Contacts says which name
matched, so a Nicklas can see he is celebrated on Niklas's day rather than
wonder why.

A double first name is celebrated **twice**: Anna-Karin gets Anna's day in
December and Karin's day in August, because both are hers. A hyphen is not a
word boundary to the folding — it is stripped — so the halves are split out
before folding rather than after.

### The leap day

Somebody born on 29 February has no birthday at all in three years out of
four. The calendar prints them on **28 February** in a common year and on the
29th in a leap year, which is how both Sweden and the UK settle it, in law and
in practice. The 28th keeps its own name days when it stands in — only the
birthday moves.

## Turning it on

Settings → **Contacts**.

1. **Nothing happens until you press the button.** The app asks the system for
   contacts permission when you press _Choose contacts…_ on that tab, and
   never anywhere else. Open the app for a year without opening this tab and
   you will never see the prompt.
2. **Granting permission marks nobody.** The list arrives with every box
   clear. This is deliberate: "yes, you may look" and "yes, print all four
   hundred of them on my calendar" are different answers to different
   questions.
3. **Tick who you want.** Each row says when that person is celebrated —
   their birthday, and the name day their name folds to — so you can see what
   ticking would get you before you tick it.

**Select all** and **Deselect all** do what they say, with one refinement:
they act on the contacts **showing**. Search for "an", press Select all, and
you have added the Annas and the Johans on screen — not the people the search
hid. The line under the buttons says how many of your contacts are in the
calendar altogether.

The search folds the same way the almanac does, so typing "kristofer" finds
the Christoffer in your phone; it also does a plain substring match, so
surnames are findable too.

**Refresh** re-reads the address book. The calendar reads it at launch and
otherwise leaves it alone, so a contact added while the app was open shows up
after a refresh.

## What is stored, and what is sent

Nothing is sent anywhere. There is no server to send it to, and the feature
makes no network request of any kind.

What is **stored** is the list of contacts you ticked, and stored as the
identifiers your device gave them — opaque strings that mean nothing outside
your own contact store. No name, no birthday, no number, no photo is ever
written down.

Names and birthdays are read into memory each time the app starts, used to
draw the calendar, and dropped when it closes. That is what makes the rest
true:

- a calendar **synced** to Dropbox, Google Drive or a local folder carries
  your notes and no contact data;
- an **exported backup** carries no contact data;
- the **Home Screen widgets** print the date and your note, never a birthday
  or a name day, and the opt-in list is excluded by name from the bridge that
  feeds them ([the native app](native-app.md));
- the opt-in list is **per device**, because the ids are that device's. A
  second phone makes its own choice.

Only two fields are ever requested from the system: the name and the birthday.
The app never asks for numbers, addresses, emails, notes, photographs, or the
relationships between your contacts, and it never adds, edits or deletes a
contact — the Android permission is `READ_CONTACTS` and there is deliberately
no `WRITE_CONTACTS`.

_Deselect all_ empties the calendar immediately. Revoking contacts permission
in your device's own settings stops the app reading them at all.

The [privacy policy](https://calendar.niclaslindstedt.se/privacy/) says all of
this in the form the app stores' privacy questionnaires are answered against.

## The seam

For contributors: the web app never asks whether it is running inside the
native wrapper. It asks whether a **contacts provider** is present on
`window` — three async methods behind `src/app/people/contactsHost.ts` — and
renders the tab if one is. The wrapper installs one
(`native/src/contactsBridge.ts`); a browser installs none.

The provider hands over names and birthdays and decides nothing else. Which
day a name is celebrated on, how a spelling folds, and what a leap-day
birthday does in a common year all live in `src/app/people/celebrations.ts`,
against the same country packs the calendar prints from — so there is one
almanac and it cannot drift.
