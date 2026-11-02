# LokiVerse v0.7.0 — QA Checklist

## GitHub Actions

- [ ] `npm run check` passes; new HTTPS range, copy and existing security tests stay green.
- [ ] Windows `verify-and-build` passes on Windows runner.
- [ ] Android `android-companion` builds and executes JUnit tests on Linux runner.
- [ ] Release tag `v0.7.0` matches Windows version and Android `versionName`; Android `versionCode` is 9.
- [ ] Both default assets and SHA256 checksums are attached to GitHub Release.
- [ ] Optional signed APK is present **only** when all signing secrets are configured; signing cert fingerprint matches prior signed versions.

## Windows & file safety

- [ ] Existing app upgraded **over** v0.6.0, not manually uninstalled; notes/tasks/settings retained.
- [ ] LokiFiles copy prompts for destination; copies only ordinary files to **existing** folders within selected root.
- [ ] Copy refuses outside-root paths and links escaping it; existing destinations are never overwritten.
- [ ] HTTPS QR pairing, PC approval, session revoke, transfer cancellation and history work.
- [ ] Range download returns 206 and correct `Content-Range` and ETag; invalid range returns 416; request without session returns 401.

## Android & real Wi-Fi

- [ ] v0.7.0 APK installs and launches; QR scanner opens without force stopping on target phone.
- [ ] A PC host is never trusted from discovery alone; QR + fingerprint + six digits + Windows approval required.
- [ ] Download a large file and briefly interrupt Wi-Fi during transfer. If Wi-Fi reconnects within limited retry window, verify resulting checksum is identical.
- [ ] No partial result is published from an incomplete network transfer; current operation may fail with explanatory message after exhausted retries.
- [ ] Transfer cancellation behaves predictably. Phone needs enough spare cache space to stage entire file.
- [ ] Verify connection-loss banner after two failed connection checks; new approval still required when session expires.
- [ ] If changing from debug-signed TEST APK to first signed APK, uninstalling the TEST app once may be required; future signed upgrades need the **same** key and increasing versionCode.

## Not changed

- [ ] Windows SmartScreen might still show Unknown Publisher: no Windows signing solution was implemented.
- [ ] Resuming downloads after a full Android app restart and resumable uploads are **not implemented**.
