// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// TODAY — the date, and what you wrote on it.
//
// The small size is the wall calendar's cell blown up to a home screen: a big
// day number with the month and weekday beside it, and the note underneath.
// The medium size is the same thing with room for the note to breathe, which
// is the only reason it exists — a note is prose, and prose wants a line.
//
// An empty day is not an error state and does not get one: no note simply
// means nothing is written there, which on a wall calendar is most days.

import WidgetKit
import SwiftUI

struct TodayWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: CalendarEntry

  private var palette: Palette {
    Palette(entry.snapshot.theme, calendarColor: entry.snapshot.calendar.color)
  }

  var body: some View {
    let key = entry.todayKey
    let note = entry.snapshot.note(on: key)

    VStack(alignment: .leading, spacing: 6) {
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        Text(dayNumber(key))
          .font(.system(size: family == .systemSmall ? 40 : 46, weight: .semibold, design: .serif))
          .foregroundColor(palette.accent)
        VStack(alignment: .leading, spacing: 0) {
          Text(shortWeekdayLabel(key, entry.snapshot).uppercased())
            .font(.caption2.weight(.semibold))
            .foregroundColor(palette.muted)
          Text(monthLabel(key, entry.snapshot))
            .font(.caption)
            .foregroundColor(palette.foreground)
        }
        Spacer(minLength: 0)
      }

      if let note {
        Text(note)
          // A month cell clamps a long note to an ellipsis and so does this:
          // the widget is a glance, and the whole note is one tap away.
          .font(.system(size: family == .systemSmall ? 13 : 15))
          .foregroundColor(palette.foreground)
          .lineLimit(family == .systemSmall ? 4 : 3)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
      }

      Spacer(minLength: 0)

      // The calendar's name only earns its line once there is a second
      // calendar to tell it apart from — but the wrapper cannot know that, so
      // it is always shown, quietly, at the foot.
      Text(entry.snapshot.calendar.name)
        .font(.caption2)
        .foregroundColor(palette.muted)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetBackground(palette.background)
  }
}

struct TodayWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CalendarToday", provider: CalendarProvider()) { entry in
      TodayWidgetView(entry: entry)
    }
    .configurationDisplayName("Today")
    .description("The date, and the note you left on it.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
