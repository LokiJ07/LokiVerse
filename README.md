# LokiVerse v0.8.0 — Ultimate Desktop Experience 💜

**Windows:** LokiVerse, a local-first Electron desktop workspace for tasks, notes, file tools, monitoring and secure LokiShare.  
**Android:** Native LokiShare companion, with approved HTTPS pairing and certificate pinning.  
**License:** MIT. **No account or cloud sync required** for local productivity modules.

## What's new in v0.8.0

### LokiFiles — Storage Insights and text preview

- **Storage Insights:** a user-initiated, read-only breakdown of category counts and sizes; top 10 largest files; total scanned bytes; exportable CSV. Only scans the **explicitly selected root folder**, with a maximum of **10,000 entries** and **10 directory levels**. If this limit is reached, figures are labelled *partial*. Symlink escapes are never followed. Results are a snapshot, not an ongoing monitor.
- **Safe text preview:** read-only rendering of selected `.txt`, `.md`, `.json`, `.csv`, `.log`, source files, and other listed text extensions. Blocks symlinks and outside-root paths, refuses binary/non-UTF-8 content and files larger than **128 KiB**. The renderer HTML-escapes content to prevent active scripts; the desktop application does not execute previewed code.
- Existing deep search, duplicate grouping, metadata inspector, directory creation, rename and **no-overwrite safe copy** remain available. No automatic cleanup/deletion was added.

### SystemPulse — Session analytics

- Collects up to **300 readings** (approx. 15 minutes at 3-second sampling) while the SystemPulse page is visible.
- Average/peak CPU usage, average/peak RAM usage, sample count, rolling utilization graphs, **Reset session**, and **Export session CSV**.
- Readings stay in process memory only and are not transmitted to a server. This is not hardware sensor software: temperature, fan speed and GPU usage are **not** provided. Measurements are OS-level approximations, not a replacement for hardware diagnostics.

### LokiNotes — Markdown export

- **Export .md** on the current saved note; preserves its title and Markdown body in a standalone UTF-8 file.
- Existing locally saved folders, pinning, preview and autosave stay unchanged. A full JSON workspace backup is still available in Settings.

### Compatibility and security

- Windows application ID **`com.lokij.lokiverse`**, installer name, NSIS settings, and `%APPDATA%/LokiVerse` data location are unchanged for in-place upgrades.
- Android package identity, HTTPS authentication, QR trust check, six-digit approval, transfer protocol, and private signing flow are unchanged. Android versionName is `0.8.0`; versionCode is `10`.
- Windows installers are **unsigned**. SmartScreen may still show **Unknown publisher**; v0.8.0 does **not** remove that warning. The test Android APK may use a different debug key between workflow runs, requiring test APK reinstall rather than upgrade.
- This release does **not** add Android features beyond compatibility/versioning changes. The Android scanner still needs physical-device validation on your phone.

## Build and release with GitHub Actions

1. In your installed LokiVerse, go to **Settings → Export** and save a workspace backup.
2. Extract this source ZIP and **copy the contents** of `LokiVerse-v0.8.0/` into your existing local `LokiVerse` Git repository, replacing source files. **Do not delete `.git`.**
3. In that repository, run:

   ```bash
   npm install
   npm run check
   git add -A
   git commit -m "feat: LokiVerse v0.8.0 ultimate desktop experience"
   git push origin main
   ```

4. Wait until the Windows and Android CI jobs pass. **Only when `v0.8.0` does not already exist**, push the tag:

   ```bash
   git tag v0.8.0
   git push origin v0.8.0
   ```

5. Download the artifacts from the tagged GitHub Release:

   - `LokiVerse-0.8.0-Setup-x64.exe` — NSIS Windows x64 installer (unsigned).
   - `LokiShare-0.8.0-Android-TEST.apk` — debug-signed Android APK, not update-stable across CI runs.
   - `LokiShare-0.8.0-Android-SIGNED.apk` — generated only if stable Android signing secrets are fully configured (see `docs/ANDROID_SIGNING.md`).

## QA checklist

See [`docs/QA.md`](docs/QA.md). **32/32 desktop/backend Node tests passed** in the source development environment, along with Chromium UI smoke tests on the new tools. **Windows installer generation and Android Gradle build must still be verified in GitHub Actions; physical Windows and Android usage must be tested by you.**

## No secret in the public repository

The Android signing instructions do not include your personal keystore. Never upload an Android release signing key or passwords to a public repository. Windows builds require no custom signing secret but remain unsigned until a legitimate code signing solution is configured.
