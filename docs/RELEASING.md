# LokiVerse v0.4.0 release checklist

1. Back up existing notes/tasks in installed Windows LokiVerse.
2. Replace source files in the SAME Git repository, keeping `.git` untouched.
3. Run `npm run check`, then `git add -A && git commit -m "feat: v0.4.0 secure LokiShare" && git push origin main`.
4. In GitHub Actions verify BOTH jobs passed: Windows verify-and-build AND Android companion build.
5. Only then `git tag v0.4.0 && git push origin v0.4.0`.
6. Watch release workflow: `windows-release` first, `android-test-release` second.
7. Download `LokiVerse-0.4.0-Setup-x64.exe` and install it **over** the existing Windows version (no manual uninstall). Verify saved tasks/notes.
8. Install `LokiShare-0.4.0-Android-TEST.apk` as a TEST-only APK. Do **not** promise stable APK updates: CI debug signing is not persistent between runs.
9. Pair on the same private network using the companion QR scanner, compare six digits and approve. Test both upload and download, verify rejection of unknown devices and revoke.
10. If Android Gradle build fails, do not publish the Android component as ready. Diagnose the Android job log and patch before tagging a new version; never move an already-published tag.

**Do not** publish any personal `.jks`, `.keystore`, private key, passwords, real QR pairing screenshots or API tokens.
