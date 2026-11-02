# Changelog

## v0.4.0 — Secure LokiShare + Native Android Companion (source preview)

- Switched temporary LokiShare listener from HTTP to HTTPS, with independent TLS identity generated on the PC on first use.
- Native Android companion project under `android-companion`, with QR pairing, SHA-256 certificate pinning, explicit PC approval, file sending and scoped downloads.
- Secure HttpOnly SameSite=Strict session cookies, refreshed device revocation, existing origin checks and file-boundary protections.
- Additional TLS persistence and signature-verification regression test.
- Android CI hotfix: use `android-actions/setup-android@v4` and install API 35/build-tools explicitly (legacy `tools` no longer available). Applied to both CI and tag release workflows.
- GitHub Actions two-platform CI and release: Windows NSIS installer and clearly marked **TEST ONLY** Android debug APK (Android debug signing differs per runner).
- Existing LokiVerse data and Windows installer identities remain unchanged.

**Compatibility:** v0.3.0 used cleartext HTTP; v0.4.0 uses HTTPS. The v0.3.0 browser QR is now replaced by a native Android companion QR. Standard browsers need to trust a self-signed certificate manually and are not the preferred path. End-to-end encrypted file contents are only guaranteed between the paired Android app and Windows host, not past either endpoint.

**Verification:** 19 automated Node tests passed locally. Actual Windows NSIS packaging and Android Gradle APK compilation must be checked on GitHub Actions, then tested on Windows/Android hardware.
