// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE APP ↔ WIDGET SEAM, Android side.
//
// Android's home-screen widgets are not a separate app the way an iOS App
// Extension is — the provider (`../../../../../../../../widgets/android`,
// copied into the app module by the config plugin) runs in this same process
// under this same uid. So there is no App Group to negotiate: a private
// `SharedPreferences` file is readable by both, and that is the whole
// container.
//
// The provider is not notified by the write itself, so an explicit
// APPWIDGET_UPDATE broadcast follows it — the same one the launcher sends on
// the provider's own schedule.

package se.niclaslindstedt.calendar.widgetbridge

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** The preferences file both sides address. Mirrored in the widget provider. */
private const val PREFS = "calendar_widget"

/** The key the snapshot JSON sits under inside that file. */
private const val SNAPSHOT_KEY = "snapshot"

/** The provider the update broadcast is addressed to. Mirrored in
 *  `plugins/with-widgets.js`, which registers this exact name in the app's
 *  manifest, and in the Kotlin file that declares it. */
private const val PROVIDER = "se.niclaslindstedt.calendar.widget.CalendarWidgetProvider"

class WidgetBridgeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetBridge")

    AsyncFunction("setSnapshot") { json: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      context
        .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(SNAPSHOT_KEY, json)
        .apply()
      notifyProvider(context)
    }

    AsyncFunction("reloadAll") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      notifyProvider(context)
    }
  }
}

/**
 * Poke every placed instance of the widget.
 *
 * `getAppWidgetIds` returning an empty array is the normal case — the user has
 * not put the widget on a home screen — and the broadcast is then a no-op
 * rather than an error worth reporting.
 */
private fun notifyProvider(context: Context) {
  val component = ComponentName(context.packageName, PROVIDER)
  val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(component)
  if (ids.isEmpty()) return
  val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
    this.component = component
    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
  }
  context.sendBroadcast(intent)
}
