// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE WHOLE APP: a WebView over the bundled web build, and nothing else.
//
// This is a deliberately thin wrapper. It starts a loopback server, points a
// WebView at it, keeps the native chrome in step with the page's theme, sends
// off-origin links to the system browser, forwards the page's storage to the
// widget publisher, and answers the page when it asks the device for its
// contacts. There is no native UI at all beyond a spinner and a failure
// screen — everything a reader sees is the web app, unchanged.
//
// The wrapper adds exactly two things the browser cannot do, and it has to add
// something: App Store guideline 4.2 rejects a build that is only a viewer for
// a website. Those two are the Home Screen WIDGETS and reading the device's
// CONTACTS, so the calendar can mark the reader's people's birthdays and name
// days. Both are read from the OUTSIDE — the page is served unchanged and
// looks for a capability rather than for this wrapper — and neither
// reimplements any of the calendar's domain. See `native/README.md`.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
} from "react-native-webview";

import {
  FALLBACK_BACKGROUND,
  FALLBACK_FOREGROUND,
  REMOTE_URL,
} from "./src/config";
import { startLocalServer, type LocalServer } from "./src/local-server";
import {
  AFTER_LOAD_SCRIPT,
  BEFORE_LOAD_SCRIPT,
  isReport,
} from "./src/injected";
import {
  CONTACTS_SCRIPT,
  isContactsRequest,
  resolveScript,
  type ContactsMethod,
} from "./src/contactsBridge";
import {
  contactsPermission,
  listContacts,
  requestContacts,
} from "./src/contacts";
import { dayKey } from "./src/snapshot";
import { forgetPublished, publishReport, reloadWidgets } from "./src/widgets";

// Hold the native splash until the WebView actually paints. Called at module
// scope so the auto-hide never wins the race; a rejection only means the
// splash was already gone, which is harmless.
void SplashScreen.preventAutoHideAsync().catch(() => {});

// Ceiling on how long the splash may stay up. The happy path hides it on first
// paint; this only fires when a load hangs, so a broken start falls through to
// the spinner or the failure screen instead of stranding the reader on a
// splash forever.
const SPLASH_TIMEOUT_MS = 10_000;

type ServerState =
  | { status: "starting" }
  | { status: "ready"; origin: string }
  | { status: "failed"; error: Error };

export default function App() {
  const [server, setServer] = useState<ServerState>(
    REMOTE_URL
      ? { status: "ready", origin: REMOTE_URL }
      : { status: "starting" },
  );
  const [background, setBackground] = useState(FALLBACK_BACKGROUND);
  const webViewRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const serverRef = useRef<LocalServer | null>(null);
  // The day the last publish was made for. When it no longer matches, the same
  // notes have to be republished so the widgets' "today" moves with the clock.
  const publishedDay = useRef(dayKey(new Date()));

  // --- the embedded server --------------------------------------------------

  const start = useCallback(async () => {
    if (REMOTE_URL) return;
    setServer({ status: "starting" });
    try {
      const running = await startLocalServer();
      serverRef.current = running;
      setServer({ status: "ready", origin: running.origin });
    } catch (error) {
      setServer({
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, []);

  useEffect(() => {
    void start();
    return () => {
      void serverRef.current?.stop();
    };
  }, [start]);

  // --- the splash -----------------------------------------------------------

  const splashHidden = useRef(false);
  const hideSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(hideSplash, SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hideSplash]);

  // A failed start has no WebView to paint, so drop the splash onto the
  // failure screen (and its Try again) rather than holding it.
  useEffect(() => {
    if (server.status === "failed") hideSplash();
  }, [server.status, hideSplash]);

  // --- the page's reports ---------------------------------------------------

  // One inbound question about the address book. Kept off the render path —
  // a permission prompt takes as long as the reader takes — and deliberately
  // NOT stored anywhere: the answer goes straight back into the page, which
  // holds it in memory and drops it on close. Nothing about a contact is
  // written to disk, to the widget container, or to a log.
  const answerContacts = useCallback(
    async (id: string, method: ContactsMethod) => {
      const value =
        method === "list"
          ? await listContacts()
          : method === "request"
            ? await requestContacts()
            : await contactsPermission();
      webViewRef.current?.injectJavaScript(resolveScript(id, value));
    },
    [],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.nativeEvent.data) as unknown;
      } catch {
        return; // not ours — the page may postMessage whatever it likes
      }

      if (isContactsRequest(parsed)) {
        void answerContacts(parsed.id, parsed.method);
        return;
      }
      if (!isReport(parsed)) return;

      // The theme travels with every report; the native chrome follows it so
      // the status bar and the safe-area bands match the page instead of
      // guessing.
      const reported = parsed.theme?.background;
      if (typeof reported === "string" && reported.trim() !== "") {
        setBackground(reported.trim());
      }

      const now = new Date();
      publishedDay.current = dayKey(now);
      void publishReport(
        { storage: parsed.storage, theme: parsed.theme ?? {} },
        now,
      );
    },
    [answerContacts],
  );

  // Coming back to the foreground after midnight: the notes are unchanged, so
  // the publisher would skip the write — but "today" has moved, so the widgets
  // need both a fresh snapshot and a reload.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      const today = dayKey(new Date());
      if (today === publishedDay.current) return;
      publishedDay.current = today;
      forgetPublished();
      void reloadWidgets();
      // The page reports on `visibilitychange`, so the fresh snapshot follows
      // on its own the moment the WebView is shown again.
    });
    return () => sub.remove();
  }, []);

  // --- navigation -----------------------------------------------------------

  // The app opens a document of its own (the privacy policy, linked from
  // Settings → General), so the wrapper has to provide the "back" the browser
  // chrome would.
  // Android routes the hardware button; iOS gets the edge swipe below.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack.current) return false; // fall through: exit the app
      webViewRef.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const origin = server.status === "ready" ? server.origin : null;

  // Keep the WebView on the embedded app. Anything else — a Dropbox or Drive
  // OAuth page, a link inside a note — belongs in the system browser, both
  // because OAuth inside an embedded WebView is blocked by the providers and
  // because App Review expects external links to open externally.
  const onShouldStartLoadWithRequest = useCallback(
    (request: WebViewNavigation) => {
      if (!origin) return false;
      if (request.url.startsWith(origin)) return true;
      if (request.url.startsWith("about:")) return true;
      void Linking.openURL(request.url);
      return false;
    },
    [origin],
  );

  if (server.status === "failed") {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.center}>
          <StatusBar style="auto" />
          <Text style={styles.errorTitle}>Could not start the calendar</Text>
          <Text style={styles.errorBody}>{server.error.message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void start()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.fill, { backgroundColor: background }]}
        edges={["top", "bottom"]}
      >
        {/* `auto` picks the bar style from the background behind it, which is
            exactly the page's own theme once it has reported one — and that
            background is the SafeAreaView above, which the page's theme
            paints. */}
        <StatusBar style="auto" />
        {origin ? (
          <WebView
            ref={webViewRef}
            source={{ uri: origin }}
            style={[styles.fill, { backgroundColor: background }]}
            javaScriptEnabled
            // Android: without this `localStorage` is unavailable entirely,
            // which is where every note lives.
            domStorageEnabled
            // Never set `incognito` — it makes WKWebView storage
            // non-persistent, which would drop the whole calendar on exit.
            incognito={false}
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            injectedJavaScriptBeforeContentLoaded={BEFORE_LOAD_SCRIPT}
            // Two scripts, one prop: the storage reporter the widgets need,
            // and the contacts provider the calendar looks for. Both run once
            // the page has loaded, and both are guarded against a second
            // injection (a reload re-runs this).
            injectedJavaScript={`${AFTER_LOAD_SCRIPT}\n${CONTACTS_SCRIPT}`}
            onMessage={onMessage}
            onLoadEnd={hideSplash}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            onNavigationStateChange={(nav) => {
              canGoBack.current = nav.canGoBack;
            }}
            // The app draws its own scroll surfaces and pins its own chrome;
            // bouncing the WebView itself just exposes the native background
            // behind the layout.
            bounces={false}
            overScrollMode="never"
          />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: FALLBACK_BACKGROUND },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FALLBACK_BACKGROUND,
    padding: 24,
  },
  errorTitle: {
    color: FALLBACK_FOREGROUND,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorBody: { color: "#57606a", fontSize: 14, textAlign: "center" },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e6eaef",
  },
  retryButtonPressed: { backgroundColor: "#d3dae1" },
  retryLabel: { color: FALLBACK_FOREGROUND, fontSize: 15, fontWeight: "600" },
});
