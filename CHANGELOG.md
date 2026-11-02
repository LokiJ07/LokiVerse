# LokiVerse Changelog

## v0.2.0 — Productivity Expansion (2026-11-02)

### Added
- Task categories, due times, upcoming/overdue filters, task search and basic title/category editing.
- Local reminders for tasks due while LokiVerse is running; optional settings toggle, with a separate notification-history file to avoid duplicate alerts across launches.
- Note folders, pinning, Markdown toolbar and safe Markdown preview.
- LokiFiles type filters (documents/images/audio/video/folders), sorting, recursive search, SHA-256 duplicate groups, create folder and rename operations.
- SystemPulse 40-sample CPU/RAM mini graphs and user-drive storage estimates.
- Compact workspace layout setting and additional UI refinements.
- 5 additional automated feature tests (13 total), plus browser UI interaction smoke tests.

### Compatibility / limits
- Backward compatible with the v0.1.1 workspace's existing tasks, notes and settings.
- Stable Windows app identity and NSIS installer settings: new installer can upgrade without manually uninstalling v0.1.1.
- No custom GitHub signing secret is required to build/release unsigned Windows installers.
- Windows upgrade must be verified on an actual Windows system after GitHub Actions finishes.
- LokiShare not shipped; no background-updater or background reminders when the application is closed.

## v0.1.1 — UI & Stability Update
- Accent customization, Ctrl+K command search, note word counter, dashboard progress and better save state.
- Last-known-good backup recovery, safer app closing and compatibility with v0.1.0 data.

## v0.1.0 — Creator Edition
- First release: Overview, Tasks, Notes, Files, SystemPulse, Settings, GitHub release checker and Windows NSIS installer.
