# LokiVerse v0.6.0 — Test Checklist

## CI and release

- [ ] `npm run check` passes locally (includes protocol/discovery tests).
- [ ] GitHub Actions Windows + Android jobs both green.
- [ ] `v0.6.0` tag matches both `package.json` and Android `versionName`.
- [ ] Both release assets and checksums appear in GitHub Releases.
- [ ] No private signing credentials, user data or session QR values in the repository.

## Windows regression

- [ ] Export a backup from installed v0.5.0; install v0.6.0 over it without uninstalling.
- [ ] Original tasks, notes, themes and files remain.
- [ ] LokiFiles search, create folder, rename, duplicate detection and Details work.
- [ ] Files outside the selected root remain inaccessible.
- [ ] Transfer Center history is preserved, pending approvals, revoke, cancellation function.
- [ ] Start/stop sharing cleanly, repeat without stale sockets.
- [ ] Windows shows transfer-complete notice when backgrounded (if allowed by OS).

## Android / network

- [ ] APK builds; launch works; scanner does not force stop (check Logcat if it does).
- [ ] Optional Nearby Scan finds host on supported LAN. If no host, QR still works.
- [ ] A discovered host is NOT auto trusted: QR and six-digit Windows approval still required.
- [ ] Android 13+ transfer-alert permission is optional and transfer still works if denied.
- [ ] Android upload/download progress, speed, completed notices and Cancel work.
- [ ] Phone remains open for transfer; no claims of background service or resume.
- [ ] Firewall/private Wi-Fi limitations documented and tested.
- [ ] Old TEST APK update may fail due to changed debug signing key; not a regression in Windows installer.
