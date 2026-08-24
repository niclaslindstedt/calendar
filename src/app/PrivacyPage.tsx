// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The standalone privacy policy, served at `/privacy` — see the path switch
// in `src/main.tsx` and the `emit-privacy-alias` plugin in `vite.config.ts`,
// which together put it on every deployment slot (`/privacy/`,
// `/preview/privacy/`, `/branch/privacy/`).
//
// The calendar is local-first with no backend of our own, no account and no
// analytics: by default everything stays on the device. Three things are
// worth spelling out, and this page exists for them — the opt-in sync
// backends (a picked local folder, the reader's own Dropbox, their own Google
// Drive), the installed app's Home Screen widgets, and the app-store build's
// access to the device's contacts, which the app stores never leave. The
// contacts section is also what the App Store and Play Store privacy
// questionnaires are answered against, so keep it true to the code.
//
// English-only by design (a legal page, not chrome), mirroring the sibling
// `notes` app's PrivacyPage. It renders no state and cannot throw, which is
// why `main.tsx` mounts it bare rather than through the app shell.

import type { ReactNode } from "react";

import { ArrowLeftIcon } from "@niclaslindstedt/oss-framework/components";

// Last meaningful change to the policy text below. Bump it whenever the
// wording is edited — it renders verbatim at the top of the page and is the
// only line a reader has to look at to see how fresh the policy is.
const LAST_UPDATED = "2026-08-24";

export function PrivacyPage() {
  // The deploy-slot root (`/`, `/preview/`, …) — the link back to the app.
  const homeUrl = import.meta.env.BASE_URL;
  return (
    <div className="bg-page-bg text-fg h-full overflow-y-auto px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 text-sm leading-relaxed">
        <header className="flex flex-col gap-3">
          <a
            href={homeUrl}
            className="text-link inline-flex items-center gap-1.5 self-start text-xs hover:underline"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to the calendar
          </a>
          <h1 className="text-fg-bright text-lg font-bold">Privacy policy</h1>
          <p className="text-muted text-xs">Last updated: {LAST_UPDATED}</p>
        </header>

        <Section title="Summary">
          <p>
            <span className="text-fg-bright">Calendar</span> is a local-first
            wall calendar, served as a static site at{" "}
            <span className="text-fg-bright">calendar.niclaslindstedt.se</span>{" "}
            and shipped to the App Store and Google Play as an app that carries
            that same page inside it. It runs entirely on your device. There is
            no backend of our own, no account, no cookies, and no analytics or
            tracking. By default your notes are stored only on your device and
            never leave it.
          </p>
          <p>
            You may <span className="text-fg-bright">optionally</span> turn on
            sync to a storage location <em>you</em> control — a local folder on
            your computer, your own Dropbox, or your own Google Drive — so the
            same calendar appears on more than one device. Even then your notes
            go only to that location in your own account; the project authors
            never receive them in any configuration. See{" "}
            <a className="text-link hover:underline" href="#cloud-sync">
              Optional sync
            </a>{" "}
            below.
          </p>
          <p>
            In the installed app you may also{" "}
            <span className="text-fg-bright">optionally</span> let the calendar
            read your contacts, so it can mark your people&apos;s birthdays and
            name days. That is off until you turn it on, it is chosen one
            contact at a time, and{" "}
            <span className="text-fg-bright">
              nothing about your contacts is ever sent anywhere
            </span>{" "}
            — not to us, not to your sync backend, not off the device at all.
            See{" "}
            <a className="text-link hover:underline" href="#contacts">
              Contacts
            </a>{" "}
            below.
          </p>
        </Section>

        <Section title="What the app stores">
          <p>
            On your device, inside the browser&apos;s{" "}
            <code className="text-fg-bright">localStorage</code> for the origin{" "}
            <span className="text-fg-bright">calendar.niclaslindstedt.se</span>{" "}
            — or, in the installed app, inside the app&apos;s own private
            storage — the calendar keeps:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              The note you wrote on each day, as plain text keyed by date.
            </li>
            <li>
              Your <em>calendars</em> — the separate sets of notes you keep side
              by side, with each one&apos;s name, icon, and colour. The list of
              calendars is kept per device; the notes in them are what syncs.
            </li>
            <li>
              Your preferences — the country calendar, the theme and appearance,
              how each view prints a day, which holiday eves your workplace
              works, your vacation allowance, and the developer switches.
            </li>
            <li>
              If you turned on an optional sync backend, the small amount of
              configuration it needs to reconnect (which folder you picked, or
              an access token your cloud provider issued to this device).
            </li>
            <li>
              If you turned on contacts in the installed app, only the{" "}
              <em>identifiers</em> of the contacts you ticked — see{" "}
              <a className="text-link hover:underline" href="#contacts">
                Contacts
              </a>
              .
            </li>
          </ul>
          <p>
            This data is stored as plain JSON on your own device. Clearing the
            browser&apos;s site data for this origin — or deleting the installed
            app — erases the local copy permanently; if you have not enabled
            sync, there is no copy elsewhere to restore from.
          </p>
          <p>
            Exporting a backup writes a file to your device and uploads nothing;
            importing one reads a file you picked and sends nothing. Both happen
            entirely in the page.
          </p>
        </Section>

        <Section title="Contacts" id="contacts">
          <p>
            The <span className="text-fg-bright">installed app</span> can mark
            the days your people are celebrated: their birthday, and — in a
            country with a name-day tradition — the day the almanac celebrates
            their name. This section describes that feature in full, because it
            is the one that touches data belonging to people other than you.
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="text-fg-bright">It is off until you ask.</span>{" "}
              The app requests contacts permission only when you open{" "}
              <em>Settings → Contacts</em> and press the button that asks for
              it. Decline, and the app never asks the system for a contact; the
              rest of the calendar works exactly as before.
            </li>
            <li>
              <span className="text-fg-bright">
                Every contact is opt-in, individually.
              </span>{" "}
              Granting permission shows you the list and marks <em>nothing</em>.
              A contact appears in your calendar only once you have ticked it
              (or pressed <em>Select all</em>), and unticking it takes it back
              out.
            </li>
            <li>
              <span className="text-fg-bright">
                Nothing about a contact is stored.
              </span>{" "}
              Names and birthdays are read from the system&apos;s contact store
              into memory each time the app starts, used to draw the calendar,
              and dropped when the app closes. What is written down is the list
              of identifiers you ticked — the system&apos;s own opaque ids,
              which mean nothing outside your device&apos;s contact store — and
              nothing else. No name, no birthday, no phone number, no email
              address, and no photograph is ever written to storage.
            </li>
            <li>
              <span className="text-fg-bright">
                Nothing about a contact is sent anywhere.
              </span>{" "}
              The app makes no network request on account of this feature, at
              any point. Contacts are not uploaded to us — we run no server to
              upload them to — and they are deliberately kept out of the sync
              backends as well: a calendar synced to Dropbox, Google Drive, or a
              local folder carries your notes and no contact data. They are also
              kept out of the Home Screen widgets (see{" "}
              <a className="text-link hover:underline" href="#installed-app">
                The installed app
              </a>
              ).
            </li>
            <li>
              <span className="text-fg-bright">
                Only two fields are read at all.
              </span>{" "}
              The app asks the system for each contact&apos;s name and birthday,
              because that is what a birthday and a name day are computed from.
              It does not read, and has no use for, phone numbers, addresses,
              emails, notes, photographs, or the relationships between your
              contacts.
            </li>
            <li>
              <span className="text-fg-bright">You can withdraw it.</span>{" "}
              <em>Deselect all</em> in <em>Settings → Contacts</em> empties the
              calendar of contacts immediately, and revoking contacts permission
              in your device&apos;s own system settings stops the app reading
              them at all.
            </li>
          </ul>
          <p>
            The website at{" "}
            <span className="text-fg-bright">calendar.niclaslindstedt.se</span>{" "}
            has no contacts feature: a browser offers the app no way to read
            them, and the app makes no attempt to obtain them by any other
            route. The <em>Contacts</em> tab is simply not shown there.
          </p>
        </Section>

        <Section title="The installed app" id="installed-app">
          <p>
            The App Store and Google Play builds are a thin native shell around
            the same web app, carrying a copy of it inside the download and
            serving it locally, so the app works with no network at all. It adds
            one feature of its own —{" "}
            <span className="text-fg-bright">Home Screen widgets</span> — and
            reads the calendar for them from the page, on the device.
          </p>
          <p>
            The widget shows the date and, if you wrote one, that day&apos;s
            note, so those are copied into a private container the app and the
            widget share. That container is local to your device and is not
            backed up to any service by the app.{" "}
            <span className="text-fg-bright">
              Access tokens and contact data are explicitly excluded from it
            </span>{" "}
            — a widget never prints a contact&apos;s name, birthday, or name
            day, and no contact information is placed where the widget could
            read it.
          </p>
          <p>
            The shell requests no advertising identifier, contains no analytics
            or crash-reporting SDK, and makes no network request of its own. The
            app stores themselves report the usual download and crash statistics
            to the developer account; that is Apple&apos;s and Google&apos;s
            collection, described in their own policies, and it carries nothing
            from inside the app.
          </p>
        </Section>

        <Section title="Network requests">
          <p>
            With no sync backend enabled, the app makes no third-party network
            calls. On the website, the only requests your browser makes are for
            the app&apos;s own static files (HTML, JavaScript, CSS, fonts, and
            icons) from its own origin; once loaded it works fully offline as an
            installed PWA. In the app-store build even those come from inside
            the download. No fonts, analytics scripts, error-reporting services,
            or advertising networks are ever loaded.
          </p>
          <p>
            If you opt in to Dropbox or Google Drive sync, the app additionally
            talks directly from your device to that provider&apos;s own API, to
            sign you in and to read and write your notes. Those requests go to
            the provider, not to us.
          </p>
        </Section>

        <Section title="Optional sync" id="cloud-sync">
          <p>
            Sync is off until you choose a backend yourself, and you can switch
            back to device-only at any time:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="text-fg-bright">Local folder.</span> Using your
              browser&apos;s File System Access API, you grant the app access to
              a folder you pick on your own computer. Your calendar is written
              there as an ordinary file. Nothing is sent over the network; the
              data never leaves your machine.
            </li>
            <li>
              <span className="text-fg-bright">Google Drive.</span> The app
              requests only the{" "}
              <code className="text-fg-bright">drive.file</code> scope, which
              lets it see and manage <em>only the files it itself creates</em>.
              It cannot see, read, or touch any other file in your Drive.
              Sign-in uses Google&apos;s OAuth flow, and the access token Google
              returns is held only on this device.
            </li>
            <li>
              <span className="text-fg-bright">Dropbox.</span> The app uses an
              app-scoped folder, so it can only read and write inside its own
              dedicated folder — never the rest of your Dropbox. Sign-in uses
              Dropbox&apos;s OAuth flow (PKCE), and the resulting token is held
              only on this device.
            </li>
          </ul>
          <p>
            In every case what the app reads or writes is{" "}
            <span className="text-fg-bright">
              your calendar and nothing else
            </span>
            , it stays in your account with your provider, and the project
            authors never receive it or hold any token for it. Revoke the
            app&apos;s access at any time from your provider&apos;s security
            settings and it simply stops syncing. When a cloud backend is active
            the app also keeps an offline mirror of the synced bytes on the
            device, so you can read and write while disconnected.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            The app sets no cookies. All persistence uses{" "}
            <code className="text-fg-bright">localStorage</code> and the storage
            location you chose.
          </p>
        </Section>

        <Section title="Web analytics">
          <p>
            None. The app loads no analytics or behavioural-tracking SDK, and
            the project authors collect no usage statistics from it.
          </p>
        </Section>

        <Section title="Server logs">
          <p>
            The website is served by{" "}
            <strong className="text-fg-bright">GitHub Pages</strong>. GitHub may
            collect standard request metadata (IP address, user agent, request
            path) for operating the service. This is covered by{" "}
            <a
              href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
              className="text-link hover:underline"
            >
              GitHub&apos;s privacy statement
            </a>
            . The project authors run no additional logging service.
          </p>
        </Section>

        <Section title="Children">
          <p>
            The app is a general-purpose calendar and is not directed at
            children under 13.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            Material changes are tracked in the public commit history of the
            source repository. The <em>Last updated</em> date at the top of this
            page reflects the most recent edit. Should a future version change
            what data is stored or sent, or add another place it can be sent,
            this policy will be updated to describe it before that change ships.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For everything, open an issue at{" "}
            <a
              href="https://github.com/niclaslindstedt/calendar/issues"
              className="text-link hover:underline"
            >
              github.com/niclaslindstedt/calendar
            </a>
            .
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-10 flex-col gap-2">
      <h2 className="text-fg-bright text-sm font-bold tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}
