# LokiVerse v0.2.0 — Windows Verification Checklist

## Upgrade & data retention

- [ ] Export backup in installed v0.1.1 before installing anything.
- [ ] New v0.2.0 installer runs over v0.1.1 **without manually uninstalling**.
- [ ] Version shown on Overview, sidebar and Settings is v0.2.0.
- [ ] Existing v0.1.1 notes, tasks and accent preference remain unchanged.
- [ ] Add new note/task, close/relaunch, confirm changes remain.
- [ ] Windows shows one LokiVerse installed-app entry.

## Features

- [ ] Create task with custom category, due date/time, priority, complete, overdue filtering, title editing.
- [ ] Optional reminder appears when task is due while app is open (polls once per minute); toggling reminders off stops future alerts.
- [ ] Create note, pin/unpin, move to another folder, Markdown bold/heading preview, autosave after relaunch.
- [ ] Choose a folder in LokiFiles, sort/filter, create new folder and rename an item. Try renaming to an existing name and verify refusal.
- [ ] Search subfolders, detect duplicate files. Large folders show a truncation warning instead of scanning forever. Duplicate scan never deletes files.
- [ ] SystemPulse updates CPU/RAM and memory history; user drive free space displays if OS supports statfs.
- [ ] Ctrl+K opens command palette, compact layout toggle and accent settings work.
- [ ] JSON Export/Restore works on a test workspace; recovery does not discard old data.

## Safety & limitations

- [ ] Check you are using a folder of **test files** for the first LokiFiles rename/create tests.
- [ ] LokiShare remains clearly marked as coming soon.
- [ ] GitHub release checker points to a public GitHub release.
- [ ] No new signing/keystore secret is requested to build or release the unsigned installer.
