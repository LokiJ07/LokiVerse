# Releasing LokiVerse v0.6.0

1. Export a backup from the installed Windows app.
2. Copy v0.6.0 source over your existing repo; preserve `.git`.
3. `npm run check` and push `main` changes; verify Windows and Android CI green.
4. Create and push immutable tag `v0.6.0` only if it does not already exist.
5. Confirm release workflow publishes Windows exe and Android TEST APK with checksums.
6. Install Windows v0.6.0 over v0.5.0; confirm notes and tasks preserved.
7. Test QR pairing, approval, transfers, cancellation, optional discovery and notifications on real devices.
8. NEVER commit signing keys/passwords, or assume a TEST APK can upgrade without uninstalling.

See `docs/ANDROID_SIGNING.md` for future release-signing requirements.
