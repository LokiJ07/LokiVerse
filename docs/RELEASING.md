# Releasing LokiVerse v0.3.0

1. Export a backup from your currently installed LokiVerse.
2. Copy the new source code into the **existing** LokiVerse Git repository, preserving `.git`.
3. `npm install`, then `npm run check`.
4. `git add -A && git commit -m "feat: LokiVerse v0.3.0 LokiShare" && git push origin main`.
5. Verify **LokiVerse Windows CI** succeeded, including the Windows installer build.
6. `git tag v0.3.0 && git push origin v0.3.0` (do not retag an existing published tag).
7. Verify **LokiVerse GitHub Release** passed, with `LokiVerse-0.3.0-Setup-x64.exe` and `SHA256SUMS.txt`.
8. Close v0.2.1 (or your installed version), run the new installer **without uninstalling the old app**.
9. Verify notes, tasks, settings, backups, and v0.3.0 UI. Test LokiShare with a Windows PC + Android phone on the same trusted private LAN.

## In-place upgrade invariants

- Never change `appId` (`com.lokij.lokiverse`) or `productName` (`LokiVerse`).
- Keep Windows NSIS `oneClick: true`, `perMachine: false`, and userData location unchanged.
- GitHub Actions creates releases using its built-in `GITHUB_TOKEN`; no custom signing key. The binary is unsigned and may trigger SmartScreen.
- GitHub Releases update checker is manual: **this application does not silently install updates**.

## Windows networking checks

- Use an IPv4 entry for the LAN your phone is on (typically `192.168.x.x`).
- If Windows Defender Firewall asks, allow LokiVerse on **Private networks** only.
- Do not allow this application on public networks. Do not forward its temporary port to the internet.
- Router client isolation and mobile hotspot rules may prevent devices from seeing each other. Avoid VPN interference.
- Pair only when 6-digit verification numbers match; disconnect/stop sharing after transfers.
- HTTP on Wi-Fi does not protect file contents from network eavesdropping: trusted/private networks only.

## Final manual QA

- Open LokiShare; select LAN interface; Start.
- Confirm local address, connection code and QR render.
- On Android Chrome, use QR or type address/code; confirm 6-digit pairing on both screens.
- Choose a receive folder, upload one file and verify bytes on disk.
- From Windows, Add files; from Android, download and verify bytes.
- Upload same filename twice and verify no overwrite.
- Disconnect phone and verify further transfers are denied.
- Stop sharing and verify the phone loses access.
- Restart LokiVerse and verify the previous session does **not** automatically reopen.
