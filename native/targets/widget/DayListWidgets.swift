// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE THREE LIST WIDGETS — Next 3 days, This week, Work week.
//
// One view, three spans (see `WidgetSpan` in Provider.swift). They differ in
// nothing else, which is the point: a reader who has learned to read one has
// learned to read all of them, and there is one row renderer to keep right.
//
// Every day in the span is printed, empty or not. That is what makes these
// CALENDAR widgets rather than agenda widgets: a week with two things in it
// should look like a week with two things in it, not like a list of two.
//
// Why three widgets instead of one with a setting: a configurable widget on
// iOS means an AppIntent configuration, which raises the widget's floor to
// iOS 17 and has no equivalent on the Android side at all. Three entries in
// the gallery costs a `Widget` struct each and works everywhere.

import WidgetKit
import SwiftUI

// MARK: - the shared view

struct DayListView: View {
  @Environment(\.widgetFamily) private var family
  let entry: CalendarEntry
  let span: WidgetSpan
  let title: String

  private var palette: Palette {
    Palette(entry.snapshot.theme, calendarColor: entry.snapshot.calendar.color)
  }

  /// How many lines of a note a row may print. The small family has to fit
  /// seven rows in a square, so it gets one; the large family has room to
  /// actually read a note in.
  private var noteLines: Int {
    switch family {
    case .systemLarge: return 2
    default: return 1
    }
  }

  var body: some View {
    let today = entry.todayKey
    let keys = span.keys(from: entry.date, week: entry.snapshot.weekRules)

    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 4) {
        Text(title)
          .font(.caption2.weight(.semibold))
          .foregroundColor(palette.accent)
          .lineLimit(1)
        Spacer(minLength: 0)
        // The calendar's name earns its place only once there is a second
        // calendar to tell this one apart from — but the widget cannot know
        // that, so it is always there, quietly, and first to be dropped when
        // the row is tight.
        Text(entry.snapshot.calendar.name)
          .font(.caption2)
          .foregroundColor(palette.muted)
          .lineLimit(1)
          .layoutPriority(-1)
      }
      .padding(.bottom, 4)

      ForEach(keys, id: \.self) { key in
        DayRow(
          key: key,
          note: entry.snapshot.note(on: key),
          isToday: key == today,
          isRest: isRestDay(key, entry.snapshot.weekRules),
          snapshot: entry.snapshot,
          palette: palette,
          noteLines: noteLines
        )
      }

      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetBackground(palette.background)
  }
}

private struct DayRow: View {
  let key: String
  let note: String?
  let isToday: Bool
  let isRest: Bool
  let snapshot: CalendarSnapshot
  let palette: Palette
  let noteLines: Int

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 6) {
      // A fixed date column, so the notes line up down the widget the way
      // they do down the app's day list.
      Text(shortWeekdayLabel(key, snapshot).uppercased())
        .font(.system(size: 9, weight: .semibold))
        // The pack's rest days are printed the way the app prints them: a
        // Sunday is not a Monday, and a week that does not say so reads wrong.
        .foregroundColor(isRest ? palette.accent : palette.muted)
        .frame(width: 26, alignment: .leading)

      Text(dayNumber(key))
        .font(.system(size: 13, weight: .semibold, design: .serif))
        .foregroundColor(isToday ? palette.accent : palette.foreground)
        .frame(width: 16, alignment: .trailing)

      Text(note ?? "")
        .font(.system(size: 12))
        .foregroundColor(palette.foreground)
        .lineLimit(noteLines)
        .truncationMode(.tail)

      Spacer(minLength: 0)
    }
    .padding(.vertical, 1)
    // Today's row is the one you look for, so it gets a tint behind it as
    // well as the accent on its number — the colour alone is easy to miss at
    // a glance on a busy home screen.
    .background(isToday ? palette.accent.opacity(0.12) : .clear)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(
      note.map { "\(longDayLabel(key, snapshot)): \($0)" }
        ?? longDayLabel(key, snapshot))
  }
}

/// Whether a day key falls on one of the pack's rest days.
private func isRestDay(_ key: String, _ rules: WidgetWeek) -> Bool {
  guard let date = dateFromKey(key) else { return false }
  let weekday = Calendar.current.component(.weekday, from: date) - 1
  return rules.restDays.contains(weekday)
}

// MARK: - the widgets

struct NextThreeWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CalendarNextThree", provider: CalendarProvider()) {
      entry in
      DayListView(entry: entry, span: .nextThree, title: "Next 3 days")
    }
    .configurationDisplayName("Next 3 days")
    .description("Today and the two days after it.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct ThisWeekWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CalendarThisWeek", provider: CalendarProvider()) {
      entry in
      DayListView(entry: entry, span: .week, title: "This week")
    }
    .configurationDisplayName("This week")
    .description("Every day of the week you are in.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

struct WorkWeekWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CalendarWorkWeek", provider: CalendarProvider()) {
      entry in
      DayListView(entry: entry, span: .workWeek, title: "Work week")
    }
    .configurationDisplayName("Work week")
    .description("This week without the days your country does not work.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
