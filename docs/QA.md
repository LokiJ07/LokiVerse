# LokiVerse v0.5.0 — Upgrade / Transfer QA Checklist

## Build

- [ ] CI: Windows `verify-and-build` green, outputs `.exe`.
- [ ] CI: Android `android-companion` green, outputs APK with Android unit tests and Kotlin dependency verification.
- [ ] Tag `v0.5.0`: release workflow green, both assets match tag.

## Windows upgrade

- [ ] Export a backup before upgrading. Run v0.5.0 installer **over** installed v0.4.2 without manual uninstall.
- [ ] Check v0.5.0 in Settings/sidebar; original notes, tasks, themes, workspace and backups intact.
- [ ] Ensure LokiShare TLS fingerprint persists after upgrade (when using the same user profile).

## End-to-end transfer center

- [ ] Start LokiShare on private Wi-Fi and connect Android after six-digit confirmation.
- [ ] Choose a receive folder, send phone → PC image (e.g. 2 MB), verify complete and correct contents.
- [ ] Share a Windows test file, download PC → phone, verify complete and correct contents.
- [ ] Confirm both directions appear in Windows transfer history, including byte totals and timestamps.
- [ ] Stop sharing, close/reopen LokiVerse: history remains visible **before** restarting sharing.
- [ ] Check filter options; `Clear finished` removes finished records but **not** received/shared files.
- [ ] Start a **large test upload** and cancel from the PC; transfer marked cancelled, no final/`.part` file remains.
- [ ] Start a **large test download** and cancel from the PC; phone gets interrupted, original Windows file remains.
- [ ] Cancel from Android; percent stops advancing, buttons return to enabled state; check Windows history. Any partial Android destination file may require manual removal.
- [ ] Test Android batch of two small files: sequential upload and progress, no unwanted extra selection.
- [ ] Close and reopen Android: local recent activity remains; `Clear phone activity` clears it.

## Security

- [ ] Pairing approval requires matching 6-digit numbers; rejected devices cannot transfer.
- [ ] Device revocation blocks new downloads/uploads.
- [ ] Existing receive-folder files are never overwritten; new files get unique names.
- [ ] Transfer history does **not** contain absolute paths, tokens, cookies, TLS private keys or file contents.
- [ ] Test camera QR scan physically; if it force stops, capture `adb logcat` before attributing cause.
- [ ] Windows SmartScreen Unknown Publisher is **not fixed** by this update; no bypass or certificate changes were made.

## Notes

Android TEST builds are debug-signed. New runner keys may require removing the older Android TEST installation before upgrading; Windows does not require manual uninstall. Android cancellation of a download may leave partial data in its Save As destination; review/remove that file if necessary.
