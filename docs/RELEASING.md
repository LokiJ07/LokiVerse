# Releasing LokiVerse v0.9.0

1. Export a JSON backup from the currently installed Windows app.
2. Copy contents of `LokiVerse-v0.9.0` into your existing repository; **keep `.git`**.
3. Run `npm install && npm run check`, then commit/push to `main`.
4. Verify both `verify-and-build` and `android-companion` jobs are green.
5. Tag `v0.9.0` only once (after CI succeeds) and push it; do not rewrite a published tag.
6. Confirm GitHub Release uploads `LokiVerse-0.9.0-Setup-x64.exe` and `LokiShare-0.9.0-Android-TEST.apk` with SHA-256 files. Optional release-signed APK requires protected secrets.
7. Install Windows v0.9.0 over v0.8.0 without first uninstalling. Confirm notes, tasks, settings and TLS pairing identity survive.
8. Test the weekly planner, recurring tasks, linked notes, task completion, and restored backups.
9. The Windows installer remains unsigned; SmartScreen may warn. Different CI Android debug signatures may require uninstalling the previous TEST APK. Never commit release signing keys.

See `docs/ANDROID_SIGNING.md` and `docs/QA.md`.
