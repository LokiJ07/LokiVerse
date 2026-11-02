# LokiVerse v0.9.0 — Quality Assurance

## Workspace 2.0

- [ ] Upgrade over v0.8.0 **without uninstalling** and confirm your old tasks, notes, preferences, and LokiShare security identity persist.
- [ ] Export backup before upgrading; verify restoring a test backup retains recurrence and linked-note IDs.
- [ ] Weekly Planner shows Monday–Sunday; previous/next week and This week work.
- [ ] Creating a task from a specific day in Planner prefills that date.
- [ ] Unscheduled tasks can be assigned to a day; Carryover items can be edited.
- [ ] Create repeating daily, weekly and monthly tasks; complete one; confirm exactly one next future occurrence.
- [ ] Undo then complete the same occurrence again; ensure no duplicate is produced.
- [ ] Edit task priority, title, category, date, time, recurrence and linked note.
- [ ] Linked task opens a note; linked note shows its pending tasks; delete note and confirm tasks remain.
- [ ] Search/filters, reminders, data autosave, reopen app, and import/export still work.

## Existing modules

- [ ] LokiFiles root-scoped operations, Storage Insights, safe preview, and CSV export.
- [ ] SystemPulse session graphs and CSV export.
- [ ] LokiShare HTTPS pairing, Android QR, upload/download, cancellation, and history.
- [ ] Windows and Android CI jobs, tagged release and installer file names.

Automation is not a substitute for real Windows/Android device testing. Android TEST signing may change between CI runs; do not disable system security to bypass installer warnings.

## v0.8.0 desktop additions

- [ ] LokiFiles → Choose folder → Storage insights: counts, file categories and largest files match a small test folder; no files are modified.
- [ ] Export CSV and open in spreadsheet software; category rows and filename sanitization work. Very large trees should report partial results.
- [ ] In LokiFiles, Preview a small `.txt` or `.md` file; HTML snippets display as plain text (never execute). A >128 KiB or binary file must be blocked.
- [ ] Directory escapes (`../`) and symlinks leading outside the selected root remain blocked.
- [ ] LokiNotes → Export `.md`: newly edited text is saved, then exported, with the correct title/content.
- [ ] SystemPulse: CPU/RAM updates, 300-sample cap, average/peak, Reset, CSV export. Data is only collected while SystemPulse is active.
- [ ] Existing tasks, notes, local backup/restore, LokiShare pairing, cancellation and transfer history are intact.


## GitHub Actions

- [ ] `npm run check` passes; new HTTPS range, copy and existing security tests stay green.
- [ ] Windows `verify-and-build` passes on Windows runner.
- [ ] Android `android-companion` builds and executes JUnit tests on Linux runner.
- [ ] Release tag `v0.8.0` matches Windows version and Android `versionName`; Android `versionCode` is 10.
- [ ] Both default assets and SHA256 checksums are attached to GitHub Release.
- [ ] Optional signed APK is present **only** when all signing secrets are configured; signing cert fingerprint matches prior signed versions.

## Windows & file safety

- [ ] Existing app upgraded **over** v0.7.0, not manually uninstalled; notes/tasks/settings retained.
- [ ] LokiFiles copy prompts for destination; copies only ordinary files to **existing** folders within selected root.
- [ ] Copy refuses outside-root paths and links escaping it; existing destinations are never overwritten.
- [ ] HTTPS QR pairing, PC approval, session revoke, transfer cancellation and history work.
- [ ] Range download returns 206 and correct `Content-Range` and ETag; invalid range returns 416; request without session returns 401.

## Android & real Wi-Fi

- [ ] v0.8.0 APK installs and launches; QR scanner opens without force stopping on target phone.
- [ ] A PC host is never trusted from discovery alone; QR + fingerprint + six digits + Windows approval required.
- [ ] Download a large file and briefly interrupt Wi-Fi during transfer. If Wi-Fi reconnects within limited retry window, verify resulting checksum is identical.
- [ ] No partial result is published from an incomplete network transfer; current operation may fail with explanatory message after exhausted retries.
- [ ] Transfer cancellation behaves predictably. Phone needs enough spare cache space to stage entire file.
- [ ] Verify connection-loss banner after two failed connection checks; new approval still required when session expires.
- [ ] If changing from debug-signed TEST APK to first signed APK, uninstalling the TEST app once may be required; future signed upgrades need the **same** key and increasing versionCode.

## Not changed

- [ ] Windows SmartScreen might still show Unknown Publisher: no Windows signing solution was implemented.
- [ ] Resuming downloads after a full Android app restart and resumable uploads are **not implemented**.
