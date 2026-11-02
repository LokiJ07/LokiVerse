# LokiVerse v1.0 — Security Model

## Local workspace data

- Tasks, notes and preferences are stored locally in the current user's Electron `userData` directory (`lokiverse-data.json`).
- Writes use a temporary file followed by rename, with a last-known-good `.bak`. On malformed data, backup content is validated **before** restoration; a corrupt primary is preserved with a unique `.corrupt-*.json` filename.
- If the primary is missing and `.bak` exists, LokiVerse attempts recovery instead of silently starting an empty workspace. If both are unusable, it refuses to overwrite files.
- Settings → Workspace Health reads the primary/backup metadata and validates structure without changing either file. A green result is not a substitute for an offline exported backup.
- Backups are not encrypted by the application. Store exports securely and do not include secrets in public issue reports.

## Desktop boundaries

- Renderer runs with `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, local CSP and no permission grants.
- The preload exposes only named IPC calls, which are accepted from the main application window.
- LokiFiles is confined to a user-selected root and blocks traversal/symlink escape. It does not auto-delete files.
- The Windows single-instance lock prevents routine concurrent desktop instances writing the same workspace. This is not a cross-machine lock.

## Secure sharing

- LokiShare only runs on user-selected private LAN interfaces when manually started.
- Local transport is HTTPS with a per-host certificate, QR-delivered fingerprint, six-digit code verification and Windows approval. Discovery alone does not grant access.
- Transfer access is limited to explicitly chosen inbox/share files with size bounds, cancellation and filename validation.
- Keep phone and PC on a trusted private network. Treat unknown QR invitations as suspicious.

## Distribution and signing

- Windows `.exe` is **not Authenticode signed**; Windows SmartScreen may display Unknown publisher. Do not disable security software.
- CI-produced Android `TEST.apk` is debug-signed and may not upgrade over the previous build. Persistent release signing requires a protected, reusable private key; never commit keystore/password to Git.
- GitHub Actions success verifies build workflow execution, not absence of security vulnerabilities. Review source and test on real devices before distributing widely.

## Reporting issues

Use your project's GitHub Issues. Describe OS, app version, reproduction steps and sanitized logs. **Never** post local backup contents, certificate private keys, six-digit pairing codes, raw QR URLs or access tokens.
