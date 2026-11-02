# LokiVerse v0.9.0 — Workspace 2.0 💜

**Windows:** LokiVerse, a local-first Electron desktop workspace for tasks, notes, a weekly planner, file tools, system monitoring and secure LokiShare.  
**Android:** Native LokiShare companion, with approved HTTPS pairing and certificate pinning.  
**License:** MIT. The productivity tools require no account, cloud service or subscription.

## New in v0.9.0

### Weekly Planner

- New **Weekly Planner** module on the sidebar, with a Monday–Sunday calendar, a “This week” shortcut, and previous/next week navigation (up to 52 weeks in either direction).
- Show scheduled tasks by day and completion state; quick-create tasks for a selected date.
- Separate **Carryover** panel for overdue tasks and **Unscheduled** panel where tasks can be assigned to any day in the visible week.
- The home dashboard now highlights the **next 7 days**, overdue work, tasks due today, and active repeating tasks.
- All dates use the device's **local calendar date**. The planner is a local view, not an external calendar sync.

### Recurring tasks and full editing

- Choose **Never**, **Daily**, **Weekly** or **Monthly** when creating/editing a task. Recurring tasks require a due date.
- Completing a repeating task marks that occurrence completed and automatically creates **one future occurrence**, preserving title, priority, category, due time and linked note. Missed dates are skipped rather than generating many backlogged tasks.
- Monthly recurrence preserves its original intended day where possible (e.g., a task created for January 31 repeats on February 28, then March 31).
- Undoing/re-completing the same occurrence **does not create duplicate future tasks**.
- Inline task editor now supports title, category, priority, due date, due time, recurrence and linked note.
- Existing reminder behavior remains **only while LokiVerse is running**; no OS-level background service or offline push was added.

### Linked LokiNotes

- Optionally link a LokiNote when creating/editing a task.
- Jump from a task or Planner card directly to the linked note. LokiNotes displays active tasks linked to the note.
- When a note is deleted, its task links are cleared without deleting the tasks.

### Compatibility and security

- Windows application ID `com.lokij.lokiverse`, NSIS installer configuration, user-data directory and saved-data filenames are unchanged. Existing v0.8.0 task/note records normalize safely with the new optional fields.
- Android package ID, signing-secret configuration, secure LokiShare HTTPS pairing and certificate trust protocol are unchanged; only Android versionName/versionCode bump to `0.9.0`/`11`.
- This version does **not** claim an Android UI or camera scanner fix. Its existing implementation still needs physical-device verification.
- Windows installer remains **unsigned**. SmartScreen's “Unknown publisher” warning may persist. Android TEST APKs may require reinstalling if their debug signing key differs between CI builds.

## GitHub Actions build and release

1. In installed LokiVerse, open **Settings → Export** and save your workspace backup.
2. Extract this ZIP and copy the **contents of `LokiVerse-v0.9.0/`** into the existing local `LokiVerse` Git repo. Keep the `.git` directory intact.
3. Run:

   ```bash
   npm install
   npm run check
   git add -A
   git commit -m "feat: LokiVerse v0.9.0 workspace 2.0"
   git push origin main
   ```

4. Verify both Windows and Android CI jobs pass, then, **only if the tag doesn't exist yet**:

   ```bash
   git tag v0.9.0
   git push origin v0.9.0
   ```

5. The tag workflow should publish:

   - `LokiVerse-0.9.0-Setup-x64.exe` — unsigned NSIS Windows installer.
   - `LokiShare-0.9.0-Android-TEST.apk` — debug-signed APK whose signing key is not guaranteed stable between builds.
   - Optional `LokiShare-0.9.0-Android-SIGNED.apk` only when your protected release-signing secrets are configured (see `docs/ANDROID_SIGNING.md`).

## Tests and QA

**39/39 Node.js desktop/backend tests passed locally**, including seven new scheduling, migration and storage-roundtrip tests. Chromium UI smoke tests covered overview, 7-day planner, creating and editing repeating tasks, linked notes, completing tasks, and assigning dates, without JavaScript exceptions.

These tests **do not** prove the Windows installer or Android APK builds work; GitHub Actions must compile them. Test the in-place Windows update on your actual PC and verify your old tasks/notes remain after upgrading. See `docs/QA.md`.

## Public repo safety

Never commit a release signing keystore, signing passwords or secret API keys. The Android TEST APK is still distinct from a stable release-signed APK. Windows installer upgrades remain configured to reuse the same application identity, but Microsoft Defender SmartScreen reputation is a separate issue.
