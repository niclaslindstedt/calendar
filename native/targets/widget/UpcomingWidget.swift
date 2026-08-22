// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// UPCOMING — the next days that have something written on them.
//
// Deliberately NOT "the next seven days": a wall calendar is mostly blank, and
// a list padded with empty rows says less than a list of the days that are
// actually spoken for. So the rows are the notes, in date order, and the
// widget is empty exactly when the calendar is.
//
// Row count is the only thing the family changes. The snapshot is already
// windowed to sixty days by the app, so there is no upper bound to enforce
// here beyond what fits.

import WidgetKit
import SwiftUI

struct UpcomingWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: CalendarEntry

  private var palette: Palette {
    Palette(entry.snapshot.theme, calendarColor: entry.snapshot.calendar.color)
  }

  /// How many rows this family can print without the last one being clipped.
  private var rowLimit: Int {
    switch family {
    case .systemLarge: return 8
    default: return 3
    }
  }

  var body: some View {
    let today = entry.todayKey
    let rows = Array(entry.snapshot.upcoming(from: today).prefix(rowLimit))

    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(entry.snapshot.calendar.name)
          .font(.caption.weight(.semibold))
          .foregroundColor(palette.accent)
          .lineLimit(1)
        Spacer(minLength: 0)
      }

      if rows.isEmpty {
        Text("Nothing coming up.")
          .font(.footnote)
          .foregroundColor(palette.muted)
      } else {
        ForEach(rows) { day in
          UpcomingRow(day: day, isToday: day.date == today, snapshot: entry.snapshot, palette: palette)
        }
      }

      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetBackground(palette.background)
  }
}

private struct UpcomingRow: View {
  let day: WidgetDay
  let isToday: Bool
  let snapshot: CalendarSnapshot
  let palette: Palette

  var body: some View {
    HStack(alignment: .top, spacing: 8) {
      // A fixed date column, so the notes line up down the widget the way
      // they do down the app's day list. The width is the widest a two-digit
      // date plus a three-letter weekday gets at this size.
      VStack(alignment: .trailing, spacing: 0) {
        Text(dayNumber(day.date))
          .font(.system(size: 15, weight: .semibold, design: .serif))
          .foregroundColor(isToday ? palette.accent : palette.foreground)
        Text(shortWeekdayLabel(day.date, snapshot).uppercased())
          .font(.system(size: 9, weight: .semibold))
          .foregroundColor(palette.muted)
      }
      .frame(width: 26, alignment: .trailing)

      Text(day.text)
        .font(.system(size: 13))
        .foregroundColor(palette.foreground)
        .lineLimit(2)
        .fixedSize(horizontal: false, vertical: true)

      Spacer(minLength: 0)
    }
    // The accessibility label reads the date in full; the visible column is an
    // abbreviation the eye completes and a screen reader cannot.
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(longDayLabel(day.date, snapshot)): \(day.text)")
  }
}

struct UpcomingWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CalendarUpcoming", provider: CalendarProvider()) { entry in
      UpcomingWidgetView(entry: entry)
    }
    .configurationDisplayName("Upcoming")
    .description("The next days you have written something on.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}
