# Weeks: the list and the search

A week number is the one thing on a wall calendar that is a **coordinate**
rather than a name. "Week 34" means nothing on its own, and neither does "the
week of the 8th" until you have the other half — which is exactly the gap
people fall into: a colleague books a meeting for week 34, and a calendar that
prints the number in its margin still leaves you counting to find it.

The week list closes that gap in both directions. It is a two-column table —
every week of the year, the dates it spans beside it — and its search takes
either half of the coordinate.

## Getting there

Tap **any week number**: in the month grid's left-hand margin, in a week
planner or day list row's right-hand rail, or on a day held up close. Tapping
anywhere else still opens the day's note.

That mirrors the way a holiday's name opens
[the holidays screen](vacation-planner.md) and one of a day's names opens
[the almanac](name-days.md), and for the same reason: what you are asking
about is already in front of you, so it doubles as the way in.

Like the almanac, it is a **dialog** rather than a destination. You are asking
where a week is, and the answer takes you back into the calendar: tapping a
week goes to it in the week planner and closes the dialog.

It goes to the **week planner** rather than leaving you where you were,
because the other two answers are both worse. Staying in the month grid
answers "which week is 34" with a month and leaves you to find the week in it;
staying in the day list answers it with a scroll position. You asked for a
week, so you get the week — and the switcher is one tap away if you wanted the
month around it.

## Two modes, one field

It opens as **the list**: every week of the year under sticky month headings,
scrolled to the week you tapped and marked there. Which year is the tapped
week's own — so a week number tapped on the 31st of December opens next year's
table, where that week belongs, rather than at the far end of a table that
does not contain it.

Typing in the field at the top turns it into **the search**, and clearing it
puts you back in the table. The same mode switch the name-day screen makes.

## What the search takes

| You type                                    | You get                         |
| ------------------------------------------- | ------------------------------- |
| `34`, `v 34`, `w 34`, `vecka 34`, `week 34` | week 34                         |
| `8 aug`, `aug 8`, `8 augusti`, `8. aug.`    | the week holding 8 August       |
| `8/8`, `8.8`, `8-8`                         | the same                        |
| `2026-08-08`                                | the same, said unambiguously    |
| `8 aug 2027`, `8/8/2027`, `8/8/27`          | the week in **that** year       |
| `augusti`, `august`                         | every week with a day in August |
| `2027`                                      | that whole year's table         |

A date with no year of its own means the year the table is of. Month names are
taken in **every country pack's language and in English**, because the country
calendar and the language the app is read in are two different settings: a
Swede running the app in English still has a Swedish calendar, and will type
whichever of "aug" and "augusti" comes to hand.

## The ambiguous date

`12/8` is the twelfth of August to most of Europe and the eighth of December
to an American, and a calendar has no business quietly deciding which one you
meant. So it does not: **both readings are listed**, each captioned with the
date it came from.

```
Vecka 33                                            10–16 aug.
12 augusti 2026

Vecka 50                                             7–13 dec.
8 december 2026
```

That caption is the whole point — it is both the answer and the question
answered, so you can see at a glance which of the two you were after. A query
with only one reading simply has one row; nothing about it is a special case.

A reading that is not a date at all is never offered: `31/2` gives nothing,
because there is no 31st month **and** no 31st of February.

## Where the code is

`src/app/weekSearch.ts` is the whole of the domain knowledge — the year's
table, the readings a query has, and the labels — and it is pure, so
`tests/week_search_test.ts` pins every reading above without a DOM.
`src/app/WeekSearch.tsx` is the screen around it.
