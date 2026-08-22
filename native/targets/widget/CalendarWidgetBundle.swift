// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The extension's entry point: every widget this app offers, in the order the
// gallery lists them. `@main` here is what makes this target a widget
// extension rather than a library of views.

import WidgetKit
import SwiftUI

@main
struct CalendarWidgetBundle: WidgetBundle {
  var body: some Widget {
    TodayWidget()
    UpcomingWidget()
  }
}
