# LokiVerse v0.5.0 · Professional Ecosystem Update

![LokiVerse](assets/icon.png)

LokiVerse is an **offline-first Windows desktop hub** for tasks, notes, scoped file management, local PC monitoring, and **secure LokiShare**. Its optional native Android companion transfers files to and from the Windows host on trusted private Wi-Fi. The code is MIT licensed.

## What's new in 0.5.0

- **Transfer Center on Windows:** persistent history (latest 100 transfers), timestamps, device labels, sent/received totals, progress bars and status filters. Finished history can be cleared without deleting any transferred files. In-progress transfers may be cancelled from the desktop app.
- **Safer interruptions:** interrupted/cancelled incoming PC uploads are cleaned from the selected inbox; successfully transferred files and source files are not deleted. Transfers still have a 512 MiB-per-file limit, explicit PC pairing approval and no-overwrite behavior.
- **Android experience:** progress bar with percentage, Cancel button, sequential processing for a selected batch of up to 20 files and phone-local recent activity. A cancelled phone download may leave a partial file at the user-chosen Save As destination; remove it manually if necessary.
- **Privacy:** the Windows transfer history is in `lokishare-transfer-history.json` under LokiVerse's user-data directory, **not** in the workspace JSON backup. It stores file names, device display labels, direction, sizes, status and timestamps, **not** paths, pairing secrets, cookies, certificate keys or file contents. Phone history is in private app preferences. History can be cleared in each app.
- **Unchanged:** all other LokiVerse modules, HTTPS certificate pinning, QR approval, Android package ID `com.lokij.lokishare`, Windows `com.lokij.lokiverse`/NSIS upgrade identity, and the existing Tasks/Notes workspace format.

## Requirements

- Windows 10/11 x64 for the desktop installer; Android 8+ for the Android companion.
- Android and PC on the **same private LAN/Wi-Fi network**, Windows Firewall allowing the app on private networks, both devices able to reach each other.
- Internet access **not needed for local transfers** (but GitHub Actions builds and dependency installation require it).

## Pair and transfer

1. Export a Workspace backup in your currently installed LokiVerse. Close it, then run the new Windows installer **over the existing one**; do not manually uninstall.
2. Open **LokiShare** and choose the private network interface. Click **Start sharing**. Choose a receive folder if you want Android → Windows uploads.
3. Open the LokiShare Android TEST companion, tap **Scan pairing QR**, or paste an invitation. The app pins the HTTPS certificate fingerprint included in the PC QR.
4. Tap **Request secure pairing** and verify that the six-digit number shown on the phone matches the number in the Windows approval request. Approve only if it matches.
5. To upload: choose files on Android (up to 20 per batch); progress appears in the phone and PC. To download: use **Add files to share** on the PC, then tap **Refresh shared files** on Android and choose where to save.
6. You can cancel an active transfer from Windows or the Android companion. To disconnect a device, choose **Disconnect** on Windows or **Stop sharing** to end the session.

### Security boundaries & limitations

- Connections use **pinned HTTPS** to the PC's locally generated certificate, not public cloud services. Session credentials never appear in transfer history.
- Sharing is explicitly started by the PC user. The phone can access only selected shared files and the selected receive directory; uploads cannot overwrite pre-existing files. The Windows UI never automatically deletes source files.
- This is **not** remote access and has no relay or auto-discovery service. QR approval is intentional. Do not use on public or untrusted Wi-Fi.
- The Android APK produced by Actions is a **debug-signed TEST build**. A different runner may use a different debug key; Android in-place updates are **not guaranteed**. Windows NSIS in-place upgrades continue to use the unchanged app identity. This release does **not** add any new signing workflow.
- Windows SmartScreen may still display **Unknown publisher** because the Windows NSIS installer is unsigned. Disabling Defender/SmartScreen is not part of this project.
- The phone's existing QR camera force-stop issue, if any, requires a physical-device test and Android Logcat; local backend tests cannot prove camera stability.

## Build and test

**Desktop** (from repository root):

```sh
npm install
npm run check
npm run start
npm run dist:win
```

**Android** (`android-companion/`): open the directory in Android Studio, or use JDK 17 + Android SDK 35 + Gradle 8.11.1:

```sh
gradle --no-daemon :app:verifyKotlinRuntimeAlignment :app:testDebugUnitTest :app:assembleDebug
```

GitHub Actions automatically builds **Windows NSIS `.exe`** and **Android TEST `.apk`**. Both CI jobs should pass before publishing.

## Release v0.5.0

Copy all extracted source files (including `.github` and `android-companion`) into the existing LokiVerse git checkout, retaining `.git`.

```sh
git add -A
git commit -m "feat: LokiVerse v0.5.0 transfer center and Android progress"
git push origin main
```

Once both GitHub Actions CI jobs are green:

```sh
git tag v0.5.0
git push origin v0.5.0
```

Do **not** move or overwrite an existing tag. GitHub Releases should publish:

- `LokiVerse-0.5.0-Setup-x64.exe`
- `LokiShare-0.5.0-Android-TEST.apk`

Both release workflows remain configured to publish checksums. Check them and test on real Windows/Android devices.

## Development status

Node security/protocol tests can be run locally. The packaged Windows Electron installer and native Android APK must still be verified by GitHub Actions, with actual pairing, cancellation, QR scanning and upgrade tests carried out on devices. See [`docs/QA.md`](docs/QA.md) for a checklist.
