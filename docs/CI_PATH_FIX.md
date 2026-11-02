# Windows CI path-guard fix (v0.2.0 source hotfix)

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

## What to do about the release tag

If `v0.2.0` has **not** been pushed as a tag: push this fix to `main`, wait for green CI, then create `v0.2.0`.

If `v0.2.0` **has already been pushed**: do not silently move or force-update that published tag. Instead, change `package.json` version from `0.2.0` to `0.2.1`, commit that change along with the fix, wait for CI, then tag and push `v0.2.1`. The release workflow requires the tag and the package version to match.
