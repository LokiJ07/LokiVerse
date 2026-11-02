# LokiVerse v0.7.0 — Advanced Ecosystem Integration 💜

**Windows**: Electron desktop productivity + LokiFiles, notes, tasks and encrypted LokiShare.  
**Android**: Native Java LokiShare companion over private Wi-Fi with QR certificate pinning and PC-approved pairing.  
**License**: MIT; offline-first; same app identities and data storage as v0.6.0.

## What's new in v0.7.0

- **Resumable PC → Android downloads (within the current operation):** authenticated HTTPS byte ranges (`Range`, `If-Range`, `ETag`, `206/416`) and a private phone-side temporary download. The Android client makes up to two bounded retries when Wi-Fi interrupts a download; it verifies server file identity and exact byte counts before copying the fully assembled file to the user's chosen Android document destination. No insecure redirects or certificate bypass. **The Android app must remain open.** Recovery does *not* survive a full app restart and does *not* apply to Android → Windows uploads.
- **Android interface refresh:** dark gradient cards, clearly organized connection/send/receive/progress/history sections, pairing guidance, and responsive transfer progress. A connection health check retries a transient failure before prompting for a newly approved secure session.
- **LokiFiles safe copy:** copy an ordinary file into another existing folder **within the root explicitly selected in LokiFiles**. A confirmation prompt appears; the operation never overwrites or deletes an existing file. Files outside the selected root and link escapes remain blocked. No general remote filesystem access.
- **Optional stable Android release signing:** protected GitHub repository secrets enable a separate `Android-SIGNED.apk` on tagged releases; **without secrets, CI and Releases still work with `Android-TEST.apk`**. See [`docs/ANDROID_SIGNING.md`](docs/ANDROID_SIGNING.md). This does **not** sign Windows or suppress SmartScreen.
- **Regression coverage:** live HTTPS range tests, file-copy boundary tests and Android pure-Java resume protocol tests (run by Gradle CI).

## Important limitations

- **The desktop QR/security flow is unchanged.** Use your own trusted private Wi-Fi, verify the certificate pin via the PC's physical QR invitation and compare the six-digit code before PC approval. Nearby discovery is an untrusted convenience hint, not automatic approval. The QR scanner on some Android devices may still need device-specific diagnostics.
- Maximum transfer size is **512 MiB per file**. Android needs enough temporary device storage to stage a downloaded file. A cancelled download is discarded from the temporary cache; interruption recovery is limited to the current in-app download operation. Uploads are **not** automatically retried, to avoid accidental duplicates.
- A completed download is written to the Android destination after staging. Cancellation or write failure during that final save can leave a partial destination document; delete it manually if necessary.
- Windows release artifacts are **unsigned**, so Microsoft Defender SmartScreen may continue to show **Unknown publisher**. We deliberately did not change Windows code-signing.
- A CI green result verifies builds, **not** physical phone camera behavior, actual Wi-Fi interruption recovery, or in-place APK signing compatibility.

## Requirements

Windows 10/11 x64, Android 8+ (API 26+), and both devices on a private local network. Android 35 SDK/build-tools are installed by CI. No cloud account needed.

## Build / release from existing repository

1. Back up your LokiVerse workspace from the installed app. Extract this ZIP and **copy all source contents** into the current `LokiVerse` Git checkout. **Keep `.git`**.
2. Test desktop code locally if Node is available:

   ```bash
   npm install
   npm run check
   ```

3. Push the changes:

   ```bash
   git add -A
   git commit -m "feat: LokiVerse v0.7.0 advanced ecosystem integration"
   git push origin main
   ```

4. After both Windows and Android CI jobs turn green, **if no `v0.7.0` tag already exists**:

   ```bash
   git tag v0.7.0
   git push origin v0.7.0
   ```

5. In GitHub Releases, expect:

   - `LokiVerse-0.7.0-Setup-x64.exe` — Windows installer, same app ID for in-place upgrades.
   - `LokiShare-0.7.0-Android-TEST.apk` — debug-signed, not reliably upgradeable over previous debug APKs.
   - `LokiShare-0.7.0-Android-SIGNED.apk` — **only if** all signing secrets have been configured beforehand.

## Suggested real-device testing

1. Close Windows v0.6.0, install v0.7.0 over it without uninstalling, and verify existing notes, tasks, transfer history and preferences.
2. In **LokiFiles**, choose a root, create two folders, copy a file between them, and check the original survives and duplicate names never overwrite.
3. Pair Android via QR (never a discovered beacon alone), then send a photo Android → Windows and download a document Windows → Android. Check certificate verification and six-digit approval.
4. Test a download with a brief Wi-Fi interruption while the app remains open, and verify that the resulting file exactly matches the PC original. Try a file larger than 10 MiB, but under 512 MiB.
5. Test manual cancellation, saved transfer history, QR scanner stability, and firewall behavior. The Android APK must build in CI before considering the release ready.

See [`docs/QA.md`](docs/QA.md) and [`docs/ANDROID_SIGNING.md`](docs/ANDROID_SIGNING.md).
