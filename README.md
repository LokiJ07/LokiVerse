# 💜 LokiVerse v0.4.0 — Secure LokiShare + Android Companion

**LokiVerse** is an offline-first Windows desktop productivity hub (Tasks, Notes, Files, SystemPulse) with local Wi-Fi transfer functionality. v0.4.0 adds encrypted transport and the source for a native Android LokiShare companion. MIT license.

## What's new

- Windows LokiShare now serves **HTTPS**, not cleartext HTTP.
- A fresh self-signed TLS identity is generated locally on the PC at first start and retained across Windows upgrades. **The private key never goes to GitHub or the phone.**
- The desktop QR contains a `lokiverse://pair` invitation with the local HTTPS URL, random join secret and certificate SHA-256 fingerprint.
- Native Java Android companion: scan the PC QR, verify the pinned TLS certificate, request pairing, compare the same six-digit code on both screens, and transfer files in both directions through Android's document pickers.
- Transfers still require explicit Windows approval and file/folder selection, are limited to **512 MiB per file**, and never automatically overwrite a local PC file.
- Prior tasks, notes, settings, `com.lokij.lokiverse` application ID and NSIS upgrade identity remain intact.
- GitHub Actions builds **Windows installer + Android TEST debug APK**. No custom signing secret is needed **for these test builds**, but the Android test APK is **not suitable as a stable public-update channel**.

## Important Android signing distinction

**Windows:** Same NSIS identity means the v0.4.0 installer can update v0.3.0 without manually uninstalling it; signing secrets are not required to build an *unsigned* Windows installer (Windows SmartScreen may show a warning).

**Android:** Each GitHub Actions runner generates its own **debug signing certificate**; a future runner's APK cannot necessarily update the previously installed one. **Do not publish the debug APK as a stable release** or promise in-place Android updates. True no-uninstall upgrades require a permanently backed-up private Android release-signing keystore, used securely for every subsequent release (generally stored as GitHub encrypted secrets or a protected signing service). **Never commit a signing keystore or password to a public repository.** The test APK's app ID is `com.lokij.lokishare` and is separate from Windows LokiVerse.

## 📲 Pairing instructions (Windows + Android)

1. Update your Windows LokiVerse to v0.4.0 using the `LokiVerse-0.4.0-Setup-x64.exe` installer. Back up your notes/tasks first.
2. On your Android 8.0+ device, install the **v0.4.0 Android TEST APK** from the GitHub release or the Android CI artifact. Use only APKs built from your own repository. Android may require enabling installation from your browser/files app.
3. Connect both devices to the same **trusted private Wi-Fi**. Open Windows **LokiShare**, choose the Wi-Fi interface and click **Start sharing**. Use **Choose receive folder** to enable incoming files.
4. Open **LokiShare** on Android and tap **Scan pairing QR**. Scan the purple QR displayed in the Windows app. The Android app validates the invitation format and pins the TLS certificate fingerprint encoded in the QR. **Use the Android companion scanner, not your standard browser QR scanner.**
5. Tap **Request secure pairing** on Android. Compare the six-digit number with the one on the Windows pairing request. Click **Approve** on Windows **only if they match**.
6. To send phone → PC, tap **Select files to send** in the app and pick files. They save only to your selected receive folder (existing files are not overwritten).
7. To send PC → phone, click **Add files to share** on Windows, then tap **Refresh shared files** on Android and choose a destination using the Android Save As dialog.
8. Use **Disconnect** or **Stop sharing** on Windows to revoke access.

**Prior Chrome compatibility:** The previous browser companion is still served at the local `https://...` URL, but standard phone browsers do **not** trust a locally generated self-signed certificate automatically. Prefer the native Android companion. Do not bypass certificate warnings for unfamiliar devices or networks.

No internet connection is needed for *local transfers*. Initial APK installation/dependency downloads can require internet. No public Wi-Fi, cross-network relay, cloud sync, automatic discovery or end-to-end cryptography independent of the PC is claimed: transfers are encrypted **between the Android client and Windows host** using HTTPS with certificate pinning.

## Android SDK CI hotfix (November 2, 2026)

The Android workflow previously called `android-actions/setup-android@v3`, whose default SDK package list could request the removed legacy `tools` package. This caused `Failed to find package 'tools'` / exit 1 **before Gradle compiled the app**. The two workflows now call `android-actions/setup-android@v4` with `packages: 'platform-tools'`, then explicitly install `platforms;android-35` and `build-tools;35.0.0` using `sdkmanager --install`. The workflow also checks that the SDK platform jar and build-tools directory exist before running Gradle.

The app, version `0.4.0`, and signing configuration are unchanged. **This patch has not been verified on GitHub's runners yet**; push to `main` and inspect the Android CI job before tagging. If `v0.4.0` was already tagged, do not move that tag: create a new patch version/tag instead.

## Developer commands

From the **Windows project root**:

```bash
npm install
npm run check
npm run start
```

From `android-companion` (Android Studio can open this folder directly; Gradle must be installed if running via CLI):

```bash
gradle --no-daemon :app:assembleDebug
```

Android build tooling: JDK 17, Android Gradle Plugin 8.9.2, Gradle 8.11.1, SDK 35, ZXing Android Embedded 4.3.0. GitHub Actions installs the build tools automatically.

## Publish through the existing repository

Copy the ZIP's contents into your current `LokiVerse` Git checkout, **including `.github` and `android-companion`**, and do not delete `.git`. Then:

```bash
git add -A
git commit -m "feat: LokiVerse v0.4.0 secure LokiShare and Android companion"
git push origin main
```

Wait for **both** `verify-and-build` (Windows) and `android-companion` (Android) CI jobs to pass. **Do not tag if either fails.** Then:

```bash
git tag v0.4.0
git push origin v0.4.0
```

The release workflow publishes `LokiVerse-0.4.0-Setup-x64.exe`, `SHA256SUMS.txt` and (when its separate Android job succeeds) `LokiShare-0.4.0-Android-TEST.apk` + its checksum. An **Android APK build has not been executed in this generation environment**: GitHub Actions will perform the first real Android compilation. The HTTPS backend tests passed locally, but physical device testing must still be done.

## Architecture

| Module | Technology |
|---|---|
| Desktop | Electron, Node.js, plain JavaScript/CSS |
| Local storage | Per-user JSON with recovery/backup protection |
| File sharing server | Node.js HTTPS, locally generated X.509 RSA certificate |
| Secure invitation | QR-based HTTPS URL + random one-time join secret + SHA-256 certificate fingerprint |
| Android | Java 17, Android SDK, ZXing offline QR scanner, `HttpsURLConnection` pinning, Storage Access Framework |
| CI/CD | GitHub Actions, electron-builder NSIS, Android Gradle Plugin |

**Security notes:** See [`docs/LOKISHARE.md`](docs/LOKISHARE.md). Certificate private key is stored under Windows app userData `share-security/`, **not** in the GitHub source. The QR invitation is a temporary secret; do not post a screenshot of your live pairing QR publicly. Because v0.3.0 used HTTP, it cannot connect securely to a v0.4.0 server; update Windows first and use the new Android companion.
