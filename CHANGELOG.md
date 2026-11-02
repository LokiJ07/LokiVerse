# Changelog

## v0.9.0 — Workspace 2.0 (2026-11-02)

- Added seven-day Weekly Planner with local calendar navigation, backlog management and in-week scheduling.
- Added daily, weekly and monthly repeating tasks with timezone-stable date calculations, month-end handling and duplicate-next-occurrence prevention.
- Added full inline task editor for dates, times, priority, categories, repeat schedule and linked LokiNotes.
- Added task ↔ LokiNotes navigation, and safely clear broken task links when deleting a note.
- Added focused home dashboard summary for the next seven days and overdue work.
- Maintained compatibility with existing workspace backups and app/installer identities. Android versionName/code bumped only; LokiShare security and workflows preserved.
- Added 7 Node regression tests (39 total), plus Chromium UI smoke checks.



## v0.8.0 — Ultimate Desktop Experience (2026-11-02)

- Added LokiFiles Storage Insights with 10,000-entry/10-level bounded read-only scans, category sizes, largest files, CSV export and symlink guard.
- Added safe text/source preview for small UTF-8 files, with HTML escaping, path-boundary checks and binary rejection.
- Added SystemPulse session analytics (300 samples), CPU/RAM averages, peaks, reset and CSV export.
- Added export of individual saved LokiNotes to portable Markdown `.md`.
- Preserved all existing LokiShare transfers, HTTPS pinning, Windows installer identity and local workspace data format. Android companion versionName/code updated without changing functionality.
- Hardened local TLS certificate serial generation against intermittent ASN.1 DER illegal-padding errors. Existing certificates are reused without rotation.
- Extended desktop regression suite from 27 to 32 tests and smoke-tested storage preview, exports and monitor UI.


## v0.7.0 — Advanced Ecosystem Integration (2026-11-02)

- Added HTTP byte-range support on the secure LokiShare Windows host, including ETag/If-Range verification and changed-file rejection.
- Android client now stages downloaded files privately and attempts bounded byte-range retries before final SAF save. No retrying uploads or continuing after app restart.
- Refreshed native Android screen layout with gradient cards, section hierarchy, and connection-health checks.
- Added safe, explicit root-scoped copy of ordinary files in LokiFiles, with no overwrite/delete behavior.
- Added optional GitHub Actions Android release APK signing using private repository secrets; TEST APK remains default.
- Kept existing identity, TLS pinning, pairing approval, app storage, Windows NSIS installer settings and CI setup.
- Added end-to-end range and safe-copy regression tests plus Java resume-protocol unit tests.

## v0.6.0 — Smart Device Ecosystem (2026-11-02)

- Added optional Windows LAN discovery UDP beacon (host name/local IP/port only, port 43961). No trusted discovery or credential transmission; QR, fingerprint pin, and user approval still mandatory.
- Added Android time-limited **Find nearby LokiVerse PCs** search and unverified-results guidance, with QR fallback.
- Added opt-in Android notification permission/transfer completion alerts, and desktop background completion alerts.
- Added current-speed readout during Android transfers and an improved Android pairing screen.
- Added LokiFiles metadata inspector with no background file content reading.
- Kept historical data, app identity, secure transfer restrictions, signed-APK limitations and cancellation semantics of v0.5.0.

## v0.5.0 — Professional Ecosystem

- Persistent transfer history and progress; cancellation and partial-upload cleanup; improved Android progress and local activity.

Previous version notes are retained in the GitHub release history.
