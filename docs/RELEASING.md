# LokiVerse v0.2.1 — GitHub Actions & In-place Upgrade Guide

The existing GitHub repository is `LokiJ07/LokiVerse` and v0.1.1 is installed on Windows. Do not create a new repository or run `git init` again.

## Before pushing

1. Open your installed **v0.1.1** → Settings → **Export**; keep the JSON backup outside the application data directory.
2. Extract `LokiVerse-v0.2.1-CI-Hotfix-Source.zip` and copy its **contents** into the current local Git repository. Replace app sources, `package.json`, and `.github/workflows/` files.
3. Preserve the `.git` directory and verify `git status` lists the expected source changes.

## Push to existing repository

```bash
git add -A
git commit -m "feat: LokiVerse v0.2.1 productivity expansion"
git push origin main
```

Confirm **GitHub Actions → LokiVerse Windows CI** has succeeded. CI executes `npm run check`, builds the installer and uploads a temporary `.exe` artifact.

## Publish release

```bash
git tag v0.2.1
git push origin v0.2.1
```

Confirm **GitHub Actions → LokiVerse GitHub Release** is green and published `LokiVerse-0.2.1-Setup-x64.exe` plus `SHA256SUMS.txt` under **Releases → v0.2.1**. The workflow uses the built-in `GITHUB_TOKEN`, **not a custom signing secret**.

## Upgrade test on Windows

1. Close running LokiVerse v0.1.1.
2. Download the installer from the official `LokiJ07/LokiVerse` GitHub Release. Verify source and checksum.
3. Run the **v0.2.1** installer **without uninstalling v0.1.1**.
4. Check that LokiVerse opens as v0.2.1, Windows Apps has only one LokiVerse entry, and existing tasks, notes and settings remain.
5. Create a note and task in v0.2.1, restart the app and verify they persist. See `docs/QA.md`.

## Do not change these between versions

- `package.json`: `build.appId = com.lokij.lokiverse`
- `package.json`: `productName = LokiVerse`
- NSIS per-user installer mode (`oneClick: true`, `perMachine: false`)
- `app.getPath('userData')` workspace location or the `lokiverse-data.json` filename

Changing identity can cause duplicate installations or lost access to expected data. As long as these settings remain stable, NSIS upgrade is designed for in-place installation; still test every release on Windows.

## Notes / boundaries

- Unsigned installers may trigger Windows SmartScreen. The CI build is **not code signed**.
- The release checker opens the GitHub Release page; it does not install updates itself.
- This environment can run Node tests and UI mock smoke tests but **cannot validate the compiled Windows `.exe` or actual in-place upgrade**. That final verification needs GitHub Actions and a Windows PC.
