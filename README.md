# ScodeConnect

A mobile-first PWA for Scode's internship enquiries, follow-ups and batch planning. It runs with PostgreSQL for a shared workspace or IndexedDB for a standalone demo. Voice extraction is simulated and requires no AI service or API key.

## Run

Use Node.js 22.9 or later.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Without database configuration, the first visit creates a browser-local demo containing 18 fictional candidates, 24 call records, reminders and two active batches.

## Connect PostgreSQL

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` in that file to the intended PostgreSQL connection string, using your provider's TLS settings. The file is ignored by Git and credentials stay on the server.
3. Choose `SCODECONNECT_WORKSPACE=demo` for shared fictional records or `SCODECONNECT_WORKSPACE=team` for an empty workspace.
4. Restart `npm run dev`. **Settings → Workspace storage** shows the active storage mode.

On first connection, the server creates the dedicated `scodeconnect` schema and tables for workspaces, candidates, calls, reminders, batches and recordings. The service role needs permission to create this schema and read and write its tables. Existing application tables in other schemas are left alone. The demo is seeded once per database. Browser-local records and database workspaces are independent.

Shared edits, recordings and related records commit in a transaction. Concurrent changes trigger a revision conflict so one user cannot silently overwrite another's work. Reload to review the current version after a conflict. Uploaded recordings are limited to 16 MB in PostgreSQL mode.

## Mobile, installation and offline access

Phones use bottom navigation, candidate cards and form sheets. Larger screens use a sidebar, tables and a multi-column dashboard. The PWA manifest, icons and service worker are included.

Serve the **Node app** via HTTPS for phone installation and microphone access. A phone's localhost points to the phone itself. On Safari use **Share → Add to Home Screen**. Supporting browsers also offer installation through Settings or their browser menu. `HOST` and `PORT` configure the development listener.

After the first online visit the app shell is available offline. In browser-demo mode all local workflows continue to work. In PostgreSQL mode the device can read its cached workspace and previously loaded recordings offline. Shared edits require a connection. Reminders run in-app, using the device's local timezone.

The development server binds to loopback. Before exposing shared candidate data to other devices, place the entire service behind your organization's authenticated HTTPS proxy. This version has no built-in user authentication or per-user access controls.

## Try the workflow

1. Open **Add enquiry** to enter a call summary, attach audio or record a note. **Process voice note** displays predefined demo data. Review the fields, add a contact number and save.
2. Open a candidate to edit preferences, attach another call or schedule a callback. Enquiries count calls. Candidate totals count distinct profiles.
3. Review **Batch opportunities**, select members, enter a duration or end date and save a proposed batch. Enrolment requires confirmation in the batch detail view.
4. Use **Follow-ups** to snooze, reschedule or complete reminders. **Insights** updates from the same records.

## Demand calculation

The engine groups candidates by technology across colleges. It requires a known availability interval, restricts fixed-date candidates to their desired date, and skips past dates, uninterested or enrolled candidates, and people reserved by open batches. It picks the date with the most compatible candidates, breaking ties by distance from desired joining dates and then by the earliest date. It repeats on remaining candidates. The default minimum is three candidates and can be changed in Settings.

## Source and checks

- `app/model.js` contains grouping, duplicate and reminder rules. `app/seed.js` contains fictional data and the mock processor.
- `app/storage.js` selects persistence. `app/local-store.js` owns IndexedDB. `backend/` contains the HTTP API, database schema and PostgreSQL transactions.
- `app/app.js`, `app/forms.js`, `app/views.js` and `app/dashboard.js` implement the UI.
- `app/sw.js` precaches the release shell. Bump the cache version when changing cached files for a release.

Run `npm test` for the business-rule tests. Set `SCODECONNECT_TEST_DATABASE_URL` to a disposable test database to also run the PostgreSQL transaction tests. The integration test creates and removes its own isolated workspace.
