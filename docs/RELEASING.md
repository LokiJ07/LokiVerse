# LokiVerse — Windows Release / Upgrade Checklist

## Important architectural decision

LokiVerse uses **electron-builder NSIS installers** with a stable `appId` and per-user install mode. This permits installing a newer Windows setup over a compatible prior installation **without asking users to manually uninstall**. The release workflow does not require a custom signing secret or Android keystore.

This is not an automatic background updater. In v0.1.1, the app checks the newest public GitHub Release and opens the official download page for you.

## First release (`v0.1.0`)

- [ ] Create the exact repository `LokiJ07/LokiVerse` (public).
- [ ] Push `main` with the source, workflows, and assets.
- [ ] Confirm `npm run check` passes locally.
- [ ] Confirm Windows CI builds and uploads a `.exe` artifact.
- [ ] Push tag `v0.1.0` (must exactly match `package.json` version).
- [ ] Confirm GitHub Release contains `LokiVerse-0.1.0-Setup-x64.exe` and `SHA256SUMS.txt`.
- [ ] On Windows 11, install and open LokiVerse.
- [ ] Create a note and task; close/reopen the app; verify they remain.
- [ ] Export backup and restore a test backup.

## First upgrade test (`v0.1.0` → `v0.1.1`)

**Before testing:** export a JSON backup in v0.1.0 and store it outside the LokiVerse data folder.

- [ ] Increase `package.json` `version` to `0.1.1`.
- [ ] **Do not change** `build.appId`, `productName`, NSIS install scope, or storage path.
- [ ] Push the code, then push tag `v0.1.1`.
- [ ] In v0.1.0 open **Settings → Check Updates**; it should find v0.1.1.
- [ ] Close v0.1.0 and run the new GitHub Release setup (do **not** uninstall first).
- [ ] Verify the Windows app is now v0.1.1 with one normal installed-app entry.
- [ ] Verify previous tasks and notes survived unchanged.
- [ ] Verify Windows Start Menu and desktop shortcuts open the new version.

## Windows SmartScreen & trust

Unsigned app builds may show an unknown publisher warning. The workflow does **not** sign Windows binaries; a certificate is an optional future enhancement and is not needed to build or install. Download only from your official Release, and compare SHA256 with the included `SHA256SUMS.txt`. **Never publish Android keystores, Windows certificates, tokens, or secrets.**

## Known boundaries / future work

- CI builds require network access to npm and Electron distribution servers.
- GitHub Releases must be public for unauthenticated in-app checks; private repositories will not be supported by this checker.
- Browser-based Electron security settings do not make untrusted user files safe; LokiFiles delegates file opening to Windows only on explicit click.
- CPU statistics are estimates based on `os.cpus()` time deltas; no CPU/GPU temperature telemetry is implemented.
- Seamless zero-click differential updates are not implemented; manual in-place installer updates are deliberately preferred while no signing secret exists.
- The installer build and upgrade path have not been physically executed on Windows in this generation environment; verify using the two-version smoke test above.
