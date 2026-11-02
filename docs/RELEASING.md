# LokiVerse v1.0.0 — Release Checklist

## Before pushing

1. Open installed v0.9.0, **Settings → Export backup** and store JSON safely.
2. Extract v1.0.0 and copy **only contents** to your existing repository. Preserve `.git`.
3. Confirm `package.json` version `1.0.0`, Electron appId `com.lokij.lokiverse`, and Android applicationId `com.lokij.lokishare` with versionCode `12`.
4. Run `npm install && npm run check` and commit source to `main`.
5. Check both Actions jobs (`verify-and-build`, `android-companion`) are green. A green job proves the CI tasks ran successfully; it doesn't verify installation on your own hardware.

## Tag only when both CI jobs pass

```bash
git tag --list v1.0.0
# Only if the above command reports no tag:
git tag v1.0.0
git push origin v1.0.0
```

Do not retag an existing published release. For follow-up fixes use v1.0.1.

## Verify release

1. Check release workflow is green and files actually appear under GitHub Releases.
2. Expected Windows asset `LokiVerse-1.0.0-Setup-x64.exe` and `SHA256SUMS.txt`.
3. Expected Android asset `LokiShare-1.0.0-Android-TEST.apk` and test APK checksum. Signed Android asset optional if protected keystore configured.
4. Download official artifacts from your own repository and independently compare hashes against release checksums.
5. Run the complete acceptance tests in `docs/QA.md` before referring to v1.0.0 as verified stable on your devices.

The Windows installer is unsigned and may still trigger SmartScreen. Do not disable Defender or bypass protections globally. The TEST Android APK may not update in place if the signing key differs.
