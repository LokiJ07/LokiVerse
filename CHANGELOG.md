# Changelog

## [0.3.0] — LokiShare LAN Transfers

### Added
- New **LokiShare** desktop dashboard with private IPv4 interface selection, on-demand start/stop, and visible receive folder.
- Phone-friendly local web app (browser, **not an Android APK**) for pairing, uploading to Windows, and downloading Windows-selected files.
- Random QR invite token and human-readable 10-character connection code; incoming pairing requests require desktop approval and 6-digit number matching.
- Short-lived, IP-bound session cookies; 2-minute pairing expiry, 30-minute idle session expiry, rejection and manual disconnect.
- Selected-files-only downloads, explicit receive directory, validated upload filenames, 512 MiB per file limit, no silent overwrites.
- Real-time transfer status, safe shutdown, bounded transfer history; no cloud required.
- Automated HTTP integration tests of pairing, upload, download, path validation, origin checks and revocation.

### Security note
- Transfers use **unencrypted HTTP** and should ONLY be used on private, trusted local networks. This is not end-to-end encrypted file transfer.
- Android browser handles device transfer; there is no native Android companion APK yet.

### Compatibility
- Keeps the v0.2.1 `com.lokij.lokiverse` identity, stable per-user NSIS installer configuration, and local workspace data format.
- Same GitHub Actions CI and GitHub Release flow; no manually created repository secret required.

## [0.2.1] — Windows CI path validation
- Fixed canonical path checks under Windows junctions/aliases without weakening traversal or symlink escape protection.
- Added security regression tests.

## [0.2.0] — Productivity Expansion
- Tasks categories, due times and running-app reminders; organized Markdown notes; LokiFiles folder operations/search/duplicates; SystemPulse performance charts; compact settings.

## [0.1.1] — UI & Stability
- Ctrl+K command palette, accent colors, live autosave, data migration, backup recovery and safe closing.

## [0.1.0] — Creator Edition
- Initial dashboard, tasks, notes, file explorer, monitor, backups, GitHub CI/release and NSIS installer.
