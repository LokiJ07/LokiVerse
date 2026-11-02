# LokiVerse v1.0.0 — Release Acceptance Tests

**Gate:** mark v1.0.0 verified for public distribution only after both GitHub builds and real-device acceptance tests pass. Automated tests alone do **not** complete this checklist.

## Automated verification

- [ ] `npm run check` passes with every Node regression test.
- [ ] Both CI jobs succeed on GitHub Actions: Windows `verify-and-build`, Android `android-companion`.
- [ ] Release workflow creates named Windows and Android assets and checksum files.
- [ ] Android unit tests pass and no signing key, password or keystore is committed.

## Windows in-place upgrade

- [ ] Export a v0.9.0 JSON backup before installation.
- [ ] Install v1.0.0 **over** v0.9.0; do not uninstall first.
- [ ] Confirm old tasks, linked notes, planner recurrences, settings and LokiShare identity remain unchanged.
- [ ] Create a task and note, close and reopen: both persist.
- [ ] Open second LokiVerse launch while first is running: existing window focuses instead of opening a competing instance.
- [ ] Settings → Workspace Health → Run Check: both files show readable, with correct counts and modification times.
- [ ] Export a backup, restore into a test environment, recheck task/note links and recurrence.
- [ ] Simulate backup recovery **only with a disposable test workspace**, never your real saved data.

## Modules

- [ ] Weekly Planner previous/next/current week, overdue backlog and monthly recurrence work.
- [ ] Task notes cross-navigation, filtering and autosave work; repeated completion does not spawn duplicate future tasks.
- [ ] LokiFiles chooser, search, preview, safe copy/rename and scan limits work. Folder traversal/symlink escape blocked.
- [ ] SystemPulse CPU/RAM graph and CSV export are readable.
- [ ] Ctrl+K search and UI appearance/compact preferences work; reduced-motion setting follows OS preference.

## Windows ↔ Android

- [ ] v1.0.0 Android APK installs, starts, camera permission is requested, QR scanner does not crash.
- [ ] Android finds the PC if LAN discovery is permitted, and QR fallback works if discovery is blocked.
- [ ] Matching six-digit code and PC approval are required; wrong fingerprint/request is rejected.
- [ ] Transfer a small photo/doc in each direction. Compare SHA-256 hashes of files.
- [ ] Cancel a large transfer: no partly completed PC inbox file remains; original is untouched.
- [ ] Disconnect Wi-Fi briefly during download; if recovery succeeds within bounded retries, output checksum matches; otherwise show error and no complete-looking corrupt file.
- [ ] Revoke Android device; old session cannot download/upload.
- [ ] Transfer history persists across Windows app restart.

## Known limitations (must be disclosed)

- Windows installer unsigned → SmartScreen may warn.
- Android TEST APK signing key may change between CI runs → in-place Android updates not guaranteed.
- No resumed Android downloads after **app restart**, no resumable uploads, no cloud sync.
- Windows and Android real-device behavior cannot be established by Linux-only/unit tests.
