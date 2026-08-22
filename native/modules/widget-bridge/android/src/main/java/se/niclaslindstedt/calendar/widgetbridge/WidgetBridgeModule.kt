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
// The providers are not notified by the write itself, so an explicit
// APPWIDGET_UPDATE broadcast follows it — the same one the launcher sends on
// a provider's own schedule.

package se.niclaslindstedt.calendar.widgetbridge

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** The preferences file both sides address. Mirrored in the widget provider. */
private const val PREFS = "calendar_widget"

/** The key the snapshot JSON sits under inside that file. */
private const val SNAPSHOT_KEY = "snapshot"

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
 * Poke every placed instance of every widget this app declares.
 *
 * The providers are ASKED FOR rather than named: the app ships four of them
 * (Today, Next 3 days, This week, Work week) and a hard-coded list here would
 * be a fourth place the set is written down — after the Kotlin classes, the
 * manifest receivers the config plugin writes, and the iOS bundle. A widget
 * added later and forgotten here would simply never refresh, which is exactly
 * the kind of silence this file cannot afford.
 *
 * Finding no ids is the normal case — nobody has put a widget on a home
 * screen — and is a no-op rather than an error worth reporting.
 */
private fun notifyProvider(context: Context) {
  val manager = AppWidgetManager.getInstance(context)
  val providers = manager.getInstalledProvidersForPackage(context.packageName, null)
  for (provider in providers) {
    val ids = manager.getAppWidgetIds(provider.provider)
    if (ids.isEmpty()) continue
    val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
      component = provider.provider
      putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
    }
    context.sendBroadcast(intent)
  }
}
