<div align="center">

# ✦ LokiVerse

**Your universe. Your tools. Your rules.**

Windows 10/11 (64-bit) · Electron desktop app · Offline-first · MIT licensed

![LokiVerse](assets/icon.png)

[![Windows CI](https://github.com/LokiJ07/LokiVerse/actions/workflows/ci.yml/badge.svg)](https://github.com/LokiJ07/LokiVerse/actions/workflows/ci.yml)

</div>

## ✨ v0.2.0 — Productivity Expansion

This release extends the **existing working v0.1.1**. The app continues to save workspace data on your computer, with no user login or cloud account. All persistent workspace data is normalized with backward-compatible defaults on load.

| Feature | Included in v0.2.0 |
|---|---|
| Overview | Task completion progress, at-a-glance totals, quick launch and upcoming tasks |
| LokiTasks 2.0 | Categories, priorities, due dates & times, active/completed/overdue filters, task editing, desktop reminders while app is running |
| LokiNotes 2.0 | Note folders, pinning, search, Markdown editing toolbar, **safe Markdown preview**, autosave, word count |
| LokiFiles 2.0 | Browse, search within selected root (recursive), type filtering and sorting, SHA-256 duplicate detection, create folder and rename file/folder |
| SystemPulse 2.0 | Sampled live CPU/RAM trends, uptime and computer details, free/total space of user's drive |
| UI & Settings | Midnight Aurora UI, 3 accent choices, compact-mode toggle, Ctrl+K search, local save indicator |
| Data safety | Backup export/restore, last-known-good recovery, same v0.1.x user-data folder, stricter IPC filesystem scope |
| LokiShare | 🚧 Planned for a later release. **Not implemented yet.** |

### Boundaries worth knowing

- **Task notifications:** Windows desktop reminders only work **while LokiVerse is running**. The app polls roughly once per minute and notifies for tasks due within the previous 24 hours. If no time is chosen, the default is 9:00 AM local time. Reminders can be disabled in Settings. These are **not background notifications after the app has been closed**.
- **LokiNotes:** Formatting uses **Markdown source + preview**, not a full WYSIWYG word processor. HTML, active hyperlinks and images are intentionally not rendered in preview.
- **LokiFiles:** Operations are confined to the root folder you select. The recursive scan skips symlinks, has a cap of 10,000 entries and 10 folder levels, and shows up to 1,000 search matches. Duplicate checks examine only files up to 100 MB each and hash at most 150 potential matches. **Duplicate detection does not delete files.** Rename refuses to overwrite an existing item. The file browser still delegates file opening to Windows on explicit clicks.
- **SystemPulse:** CPU usage is estimated from OS counters, RAM and disk free-space figures come from the OS. GPU/CPU temperatures, disk SMART health and every attached drive are **not** supported.
- **Updates:** "Check Updates" checks public GitHub Releases. To upgrade, manually download and run the new unsigned Windows installer; background automatic installation is **not** implemented.

## ⬆️ Upgrade from v0.1.1 without uninstalling

1. On your current LokiVerse v0.1.1, use **Settings → Export** to make a backup in a safe folder.
2. Copy **contents** of this source into your existing local `LokiVerse` Git repository, replacing old source files and `.github` workflows. **Never delete the `.git` folder.** Do not copy over a locally installed app's data folder.
3. From that existing repository, run:

```bash
git add -A
git commit -m "feat: LokiVerse v0.2.0 productivity expansion"
git push origin main
```

4. Confirm **GitHub Actions → LokiVerse Windows CI** is green.
5. Tag the release **only after CI is green**:

```bash
git tag v0.2.0
git push origin v0.2.0
```

6. Wait for **GitHub Actions → LokiVerse GitHub Release** to finish. Go to Releases and get `LokiVerse-0.2.0-Setup-x64.exe`.
7. Close v0.1.1 and run the installer **without uninstalling** the old one. Verify Settings shows v0.2.0 and that old notes/tasks remain. See [`docs/RELEASING.md`](docs/RELEASING.md) and [`docs/QA.md`](docs/QA.md).

### Why no custom signing secret?

The installer is a Windows **NSIS** per-user installer with the same `appId` (`com.lokij.lokiverse`), productName (`LokiVerse`) and installer configuration as v0.1.x. A custom GitHub secret/Android keystore is **not required to build**. Windows SmartScreen may warn because the binary is **not code signed**. The project uses the built-in `GITHUB_TOKEN` with `contents: write` to publish GitHub Releases. This is different from Android's APK signature requirements.

## 🛠️ Development

Prerequisites: Node.js 22+, npm, Windows for local Windows installer compilation.

```bash
npm install
npm run check
npm start
```

To build on Windows (or let the GitHub Action build it):

```bash
npm run dist:win
```

The `.exe` is generated in the `release/` directory.

## 🔐 Privacy & security notes

- Electron renderer: context isolation on, sandbox enabled, node integration disabled, strict preload bridge.
- LokiFiles scans are bounded and skip symlink entries; root escape attempts are rejected.
- Rename and folder creation are user-initiated and do not silently delete anything.
- Data writes are serialized, normalized and use atomic temporary files with a last-known-good backup for recovery.
- GitHub requests are limited to checking the newest public release; no analytics or cloud sync.

## 🗓️ Roadmap

- **v0.3.x:** LokiShare pairing and LAN transfer proof of concept (future scope, not shipped).
- More flexible note formatting, stronger search, optional safe file operations and richer system telemetry (not promised in v0.2.0).

Made by **LokiJ** · MIT License.
