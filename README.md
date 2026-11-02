# LokiVerse v0.6.0 — Smart Device Ecosystem 💜

Windows desktop productivity + secure Android-to-Windows LokiShare over private Wi-Fi. **Offline-first, open-source (MIT)**. Built from the working v0.5.0 codebase, keeping the same Windows installer ID, Android package ID, HTTPS identity, and notes/tasks data format.

## What's new in v0.6.0

- **Nearby PC discovery (optional):** when Windows sharing is started, it advertises its local host name, IP and HTTPS port by LAN UDP broadcast (port `43961`). Android's **Find nearby LokiVerse PCs** listens for a few seconds and lists *unverified hints*. This is *not* automatic trusted pairing: the user **must still scan the PC QR, pin the HTTPS certificate, compare the six-digit code and receive Windows approval**. No QR secret, session token, filename, file content or certificate fingerprint is transmitted in the discovery packet.
- **Android interface refresh:** clearer connection steps, local-network status banner, discovery status/results and live transfer throughput alongside the existing percentage progress and Cancel controls.
- **Transfer completion notifications:** Windows can notify when an unseen transfer completes while the app is not focused; Android provides optional transfer alerts (permission prompt only when the user chooses it on Android 13+). These are completion alerts, not a background upload service; the Android app must stay open during transfers.
- **LokiFiles metadata inspector:** click **Details** next to an item to show type, relative path, size and modified date without opening or parsing the file. Existing root-scoped search, duplicate detection, create-folder and rename guards remain unchanged.
- **QA:** new subnet-broadcast/protocol tests; unchanged HTTPS pairing and cancellation security tests.

## Limitations & safety

- Optional UDP discovery is **best effort** and may be filtered by the router, VPN, Android permissions, phone Wi-Fi implementation or Windows Firewall. The **QR fallback always remains**. Do not use discovery as proof of device identity; LAN packets can be spoofed. There is **no auto-approval and no direct connect from a discovered beacon**.
- Use **trusted private Wi-Fi only**. The desktop host only starts when clicked. The Android app verifies its certificate pin from the displayed PC QR; an authenticated session also requires PC approval.
- No cloud, remote access, server relay or resumable transfers. Safe metadata GET calls can retry once after a timeout; there is no silent retry of uploads. If an upload fails, check the PC inbox/transfer history before retrying to avoid duplicate files.
- Files are capped to 512 MiB each and selected explicitly. Incoming files never overwrite existing ones; canceled incoming uploads clean their `.part` files. Canceling a phone download may leave a partial file at the selected destination.
- **Windows** remains unsigned, so SmartScreen may show an Unknown Publisher warning. Code signing was **not** part of v0.6.0.
- **Android** CI still produces a **debug-signed TEST APK**: different CI runs may use different keys, so no-uninstall APK updates are **not guaranteed**. Never store a keystore or password in this public repository. See [`docs/ANDROID_SIGNING.md`](docs/ANDROID_SIGNING.md) for the separate official release-signing plan.
- Android QR camera behavior and LAN discovery need real device testing. A successful CI build does not prove camera stability.

## Requirements

Windows 10/11 x64, Android 8+ (API 26+), same private local Wi-Fi/LAN, network access allowed on Windows *private* firewall profile. Internet not needed for transfers; GitHub checks need it for dependencies.

## Build and release

Copy all files from the v0.6.0 ZIP into your **existing** `LokiVerse` Git checkout (keep the `.git` directory). Back up tasks/notes in the installed app first.

```bash
npm install
npm run check
git add -A
git commit -m "feat: LokiVerse v0.6.0 smart device ecosystem"
git push origin main
```

Once **both** Windows and Android jobs are green, and the `v0.6.0` tag does not already exist:

```bash
git tag v0.6.0
git push origin v0.6.0
```

Expected files in GitHub Releases:

- `LokiVerse-0.6.0-Setup-x64.exe` (Windows installer, unchanged `com.lokij.lokiverse` app ID)
- `LokiShare-0.6.0-Android-TEST.apk` (Android CI debug test APK, unchanged `com.lokij.lokishare` ID)

This uses the same working GitHub Actions workflows as v0.5.0. **Do not delete or move existing Git tags.** Do not commit signing credentials.

## First-run QA

1. Windows: export a backup, close LokiVerse, install v0.6.0 **over** v0.5.0. Verify the previously saved notes, tasks and preferences.
2. Windows → LokiShare → Start sharing on a private interface. Choose inbox for uploads and shared files for downloads.
3. Android: optionally tap **Find nearby LokiVerse PCs**; whether a PC appears or not, tap **Scan pairing QR** and scan the QR **on your own PC**. Confirm certificate validation and the matching six-digit code; approve on PC.
4. Transfer a small file both ways. Observe progress/speed, cancellation, and new completion alerts (enable phone notifications if desired).
5. In LokiFiles, select a folder and click **Details**; verify no file is opened by that action.
6. Test normal navigation, export/restore, restart persistence and Windows in-place upgrade.

**See [`docs/QA.md`](docs/QA.md) for all regression checks.**
