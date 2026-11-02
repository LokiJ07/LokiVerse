# Changelog

## [0.2.0 source hotfix] — Windows CI path validation
- Fix canonical-root comparisons in LokiFiles path resolution to work with Windows junctions/aliases without allowing traversal or symlink escapes.
- Align folder create, rename, search and duplicate scan paths with the canonical selected folder.
- Add two security regression tests; 15 tests now run (verified locally on Linux/Node 22).
- No changes to application identity, installed-data location, installer behavior, or workspace schema.


## [0.1.1] — UI & Stability Update

### Added
- Command palette (`Ctrl+K`) to search app modules, existing notes, and tasks; supports arrow keys, Enter, and Escape.
- Three customizable color accents (Aurora purple, Arctic cyan, Sunset rose) saved in local workspace settings.
- Dashboard task completion progress summary, including active and overdue counts.
- Live save status in the header, plus editor word counter.
- Last-known-good `.bak` workspace backup and best-effort recovery from damaged JSON. When possible, the corrupt original is retained for inspection.
- App close coordination to let pending note edits finish saving before exiting.
- Automated persistence, migration-compatibility and recovery tests.

### Improved
- Shorter notes autosave debounce and explicit flushing on navigation, import, and app close.
- Restoring a backup waits for queued writes from the renderer before replacing data.
- Accent-aware buttons and navigation, focus behavior, and reduced-motion support.
- Settings appearance and visual consistency.

### Compatibility
- Retains `com.lokij.lokiverse` appId, `LokiVerse` product name, per-user NSIS Windows setup and the same `userData` path.
- Data from v0.1.0 reads correctly; a missing `settings.accent` automatically defaults to `purple`.
- GitHub Actions build and release workflows remain secret-free (use the built-in `GITHUB_TOKEN`).

### Notes
- This is a manually downloaded and run in-place NSIS upgrade, **not** a silent updater.
- Windows `.exe` build and install-over-v0.1.0 must be confirmed on GitHub Actions and a real Windows device.
- LokiShare remains a roadmap item and is not functional yet.
