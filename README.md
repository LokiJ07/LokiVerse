# 💜 LokiVerse v1.0.0 — First Stable Release Candidate

**LokiVerse** is an offline-first Windows workspace for tasks, calendar planning, notes, local file tools, hardware monitoring and secure on-demand file sharing with an Android companion.

**Status:** v1.0.0 source ready for CI and real-device release testing. Passing automated tests are not a substitute for verifying the Windows installer and Android app on actual devices.

## What is included

| Windows feature | Capabilities |
|---|---|
| Overview | Dashboard, progress indicators, navigation and Ctrl+K search |
| Weekly Planner | Monday–Sunday planning, overdue tasks and local scheduling |
| LokiTasks | Priorities, categories, due times, recurring tasks and linked notes |
| LokiNotes | Markdown preview, folders, pinning, autosave and Markdown export |
| LokiFiles | Scoped browsing, safe copy/rename, folder creation, duplicate detection and storage insights |
| SystemPulse | CPU/RAM snapshots, session analytics and CSV export |
| LokiShare | LAN HTTPS with QR fingerprint pinning, six-digit pairing approval, transfer center and scoped file access |
| Settings | Local JSON export/restore, appearance, update check and new Workspace Health checker |

**Android companion:** native LokiShare with QR scanning, approval, secure uploads/downloads, recent activity, transfer speed/cancellation, nearby-PC hints and current-session download recovery. There is **no cloud server** and discovery **does not authorize a device** by itself.

## New in v1.0.0

- Workspace recovery now detects a **missing primary file with a valid `.bak`** and restores it instead of opening with an empty workspace.
- Invalid JSON structure cannot silently replace your saved tasks and notes.
- New **Settings → Workspace Health → Run Check** displays readability, item counts, modification timestamps and backup availability without changing the files.
- Single-instance Windows lock and privileged IPC restricted to the active LokiVerse window.
- Reduced-motion accessibility support and extended automated regression checks.

## Getting started

1. Requires Windows 10/11 (x64) and a compatible Android phone for the optional companion.
2. Download the ZIP and **copy its contents into your existing local `LokiVerse` repository**, preserving `.git`.
3. First export a JSON backup from your installed LokiVerse version. Commit the source and push to `main`.
4. Check both GitHub Actions jobs. Only after CI succeeds, push `v1.0.0`. Download assets from your own GitHub Releases.
5. Close the previous Windows LokiVerse and run the new installer **without manually uninstalling**. Check notes/tasks/settings, backup health and LokiShare pairing. See `docs/QA.md`.

### Local testing

```bash
npm install
npm run check
npm start
```

On Windows, build the NSIS installer with `npm run dist:win`. Android CI runs Gradle/SDK 35 builds on GitHub Actions.

### GitHub workflow

```bash
git add -A
git commit -m "release: LokiVerse v1.0.0 stability and data integrity"
git push origin main
# after both CI jobs are green and the v1.0.0 tag does not already exist:
git tag v1.0.0
git push origin v1.0.0
```

Release workflow builds a Windows NSIS installer and an **Android-TEST APK**, plus SHA256 checksums. The optional release-signed Android APK is created only when all protected signing secrets are configured.

## Important limitations

- The Windows installer is **unsigned**. Microsoft SmartScreen may display **Unknown publisher**; this release does not bypass Windows protections.
- The default Android test APK is debug signed using CI's nonpersistent key; signature mismatches can require uninstalling the previous test APK, which removes Android-local app data. For persistent Android update signing, follow `docs/ANDROID_SIGNING.md`.
- Android QR scanner stability and local-network discovery still require verification on your particular phone/router.
- Transfer data uses HTTPS with pinned certificate fingerprint; pair only after comparing the on-screen confirmation code. Android download recovery currently works **within the active transfer**, not after app restart.
- Data is stored in the current user's application data directory, not GitHub. The selected LokiFiles directory must be explicitly chosen.

## More documentation

`CHANGELOG.md` · `docs/QA.md` · `docs/RELEASING.md` · `docs/SECURITY.md` · `docs/ANDROID_SIGNING.md` · `docs/LOKISHARE.md`

MIT License · LokiJ
