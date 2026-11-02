<div align="center">

# ✦ LokiVerse

**Your universe. Your tools. Your rules.**

Windows desktop creator workspace · Offline-first · Open-source · Midnight Aurora design

![LokiVerse logo](assets/icon.png)

[![Windows CI](https://github.com/LokiJ07/LokiVerse/actions/workflows/ci.yml/badge.svg)](https://github.com/LokiJ07/LokiVerse/actions/workflows/ci.yml)

</div>

## ✨ LokiVerse v0.1.1 — UI & Stability Update

LokiVerse is a real Windows desktop app, not a hosted website. All your notes and tasks are stored locally on your computer.

| Module | Included today? | Features |
| --- | --- | --- |
| Overview | ✅ | At-a-glance metrics, task progress, pending tasks, quick launch |
| My Tasks | ✅ | Add, prioritize, set deadlines, complete, delete |
| LokiNotes | ✅ | Create, edit, search, delete, automatic local saving, word count |
| LokiFiles | ✅ | Choose a folder, browse, open files, reveal in Explorer. **Read-only** |
| SystemPulse | ✅ | CPU utilization estimate, RAM usage, device details |
| Settings | ✅ | Display name, theme accent, export/restore backup, check GitHub Releases |
| LokiShare | 🚧 Planned | Android↔Windows transfer; **not implemented** yet |

> v0.1.1 builds on the tested v0.1.0 design. Source-level tests and browser UI smoke tests passed in the development environment; Windows upgrade validation is still required.

## 📦 Setup on Windows

Required: Node.js 22+, Git, and an internet connection for npm (only to install development dependencies).

```bash
npm install
npm run check
npm start
```

Build the Windows installer **locally on Windows**:

```bash
npm run dist:win
```

The resulting `.exe` should be under `release/`.

## 🤖 GitHub Actions — build & release (no custom secrets)

> The following section describes creating a brand-new repository only. Existing v0.1.0 users should follow the **upgrade instructions above** instead.

1. **Create a public empty GitHub repository named `LokiVerse`** under the **`LokiJ07`** account. Do not initialize the remote with README or license (both are included here).
2. Open Git Bash or VS Code terminal in the **LokiVerse** project folder.
3. Run:

```bash
git init
git add .
git commit -m "feat: LokiVerse Creator Edition v0.1.0"
git branch -M main
git remote add origin https://github.com/LokiJ07/LokiVerse.git
git push -u origin main
```

4. Go to **Actions → LokiVerse Windows CI**. Pushes to `main` will run tests, build the Windows installer, and upload a 7-day workflow artifact.
5. To **publish an official public release**, use:

```bash
git tag v0.1.0
git push origin v0.1.0
```

6. Go to **Actions → LokiVerse GitHub Release**. When it succeeds, see **Releases** in the repository. Download `LokiVerse-0.1.0-Setup-x64.exe` from that release.

The release workflow uses GitHub's **automatic `GITHUB_TOKEN`**, not a manually configured GitHub repository secret. Under repo **Settings → Actions → General**, make sure Actions are enabled. The release workflow explicitly requests `contents: write`.

**If your GitHub username or repository name differs**, update `RELEASE_REPOSITORY` in `src/main.cjs`, the repository links in this file, and your git remote **before publishing v0.1.0**, otherwise the app's update checker will look at the wrong repo.

## 🔥 Upgrade your existing v0.1.0 installation to v0.1.1

**You already have a Git repository and v0.1.0 installed. Do NOT initialize a new repository.**

1. **Before upgrading**, in LokiVerse v0.1.1 go to Settings → Export, and keep an external JSON backup.
2. Extract the v0.1.1 source ZIP. Copy the **contents** of its `LokiVerse-v0.1.1` directory into your current local `LokiVerse` Git repository folder, replacing files when asked. Do not overwrite/delete your `.git` folder.
3. In Git Bash, opened in the existing repository:

```bash
npm run check   # if dependencies are already installed; otherwise npm install first
git add -A
git commit -m "feat: LokiVerse v0.1.1 UI and stability"
git push origin main
```

4. Check GitHub Actions → LokiVerse Windows CI. When green, publish the new version:

```bash
git tag v0.1.1
git push origin v0.1.1
```

5. Check GitHub Releases → v0.1.1 and download `LokiVerse-0.1.1-Setup-x64.exe`.
6. **Close v0.1.0 and run the new installer over it. Do not manually uninstall v0.1.0.** Launch LokiVerse and verify that your tasks and notes survived, that Settings says `v0.1.1`, and that Ctrl+K works.

See [CHANGELOG.md](CHANGELOG.md) and [docs/RELEASING.md](docs/RELEASING.md).

## 🔁 Release new versions without uninstalling the old version

LokiVerse uses a per-user NSIS Windows installer. Upgrades rely on these **stable values**:

- `build.appId`: `com.lokij.lokiverse` — **never change** once released.
- `productName`: `LokiVerse` — keep consistent.
- Windows NSIS target and per-user install mode — keep consistent.
- Electron user data location (typically `%APPDATA%\LokiVerse`) — keep consistent.
- The `package.json` version must increase on each release.

**Example later upgrade to v0.2.0:**

1. Make changes, then change `"version": "0.1.0"` to `"version": "0.2.0"` in `package.json`.
2. Commit and push changes to `main`.
3. Run `git tag v0.2.0` and `git push origin v0.2.0`.
4. Download the new setup `.exe` from the corresponding GitHub Release.
5. **Close LokiVerse and run the new installer. Do not manually uninstall the old version.** The existing installation should be upgraded while keeping your user data.
6. Open LokiVerse → Settings → Version & updates, verify that it shows v0.2.0 and that existing notes/tasks remain.

The built-in update checker fetches the latest **public** stable GitHub Release and helps you open the official release page. It **does not** silently download or install executables. For now, manually run the newest setup file. See [docs/RELEASING.md](docs/RELEASING.md) for the detailed checklist.

**Important:** This Windows NSIS workflow is different from Android APK signing. If an Android signing key was lost, Windows installer configuration cannot repair the Android signature mismatch. An unsigned Windows app may also show a **Windows SmartScreen / Unknown Publisher** warning. Do not bypass warnings on unexpected downloads; verify the release source and SHA256 hash.

## 🔐 Privacy, permissions and safety

- LokiVerse v0.1.1 does not transmit task or note contents to any server.
- GitHub API access occurs only after you ask to check for updates.
- LokiFiles shows files only within a folder selected by the user; it does not delete, move, or rewrite them. Symbolic links pointing outside the selected root are blocked.
- UI content is escaped to avoid HTML injection, and `contextIsolation`, `sandbox`, and a narrow preload bridge are enabled.
- JSON backups are human-readable files, not encrypted. Keep exports in a safe location.
- App data is not deleted during normal version upgrades. Nevertheless, always export a backup before testing a new release.

## 🧱 Tech stack

Electron 45 · Node.js · Vanilla JavaScript · CSS · Windows NSIS · GitHub Actions · GitHub Releases

## 🛠️ Developer scripts

| Command | Action |
| --- | --- |
| `npm start` | Run the desktop app |
| `npm run check` | Validate JS syntax and run automated unit tests |
| `npm run dist:win` | Build a Windows `.exe` installer (on Windows) |
| `npm run pack:win` | Build unpacked app directory (on Windows) |

## 📄 License

MIT License · © 2026 LokiJ
