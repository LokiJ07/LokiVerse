# Windows CI path-guard fix (v0.2.1 hotfix)

## Failure summary

The GitHub Windows CI job reported an unexpected `Link escapes selected folder.` error in the `directory operations prevent traversal, overwrite and invalid Windows names` test (in `tests/features.test.cjs`). An error from `resolveInside()` prevented the `npm run check` step from passing; the installer build step did not run.

The test framework reports the start of the **test case**, not necessarily the specific `assert.rejects()` call that threw. In the original source, `resolveInside(root, '../')` must fail the lexical check before `fs.realpath()` if `isWithinFolder()` is functioning as written. Therefore it is not established from the test case's location alone that the traversal assertion reached the symlink check.

The underlying portability hazard was that `fs.realpath(candidate)` (a canonical path) was compared against the caller's `root` (which could be non-canonical on Windows due to a junction, alias, or path spelling). A valid directory could be misclassified as escaping the selected folder.

## The fix

- Check lexical containment using `path.resolve(root)` and `path.resolve(root, relative)` *before* resolving links. `../` is still rejected with `Outside selected folder.`.
- Canonicalize **both** the selected root and target using `fs.realpath()` before comparing the physical paths. A symlink or junction that genuinely escapes the selected root is still rejected with `Link escapes selected folder.`.
- Use the same canonical root for folder creation, rename, recursive search and duplicate scanning.
- Add cross-platform tests covering `../` rejection, an alias/junction used as the selected root, and a link that escapes the selected root.

## Local verification

`npm run check` on Node.js 22 (Linux) passed all 15 tests and syntax validation. Windows CI and the resulting installer remain to be verified on GitHub Actions. No appId, productName, userData path, installer settings, or saved-data schema was changed.

## Release instructions

This hotfix has package version **0.2.1** and is intended for repositories where the `v0.2.0` tag has already been pushed. Keep the existing `v0.2.0` tag immutable, commit this fixed source on `main`, wait for CI, then `git tag v0.2.1` and `git push origin v0.2.1`.
