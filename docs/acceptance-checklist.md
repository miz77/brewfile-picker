# Acceptance Checklist

Use this before publishing the MVP.

## Core App

- [x] `/p/lab-2026` opens through SPA fallback.
- [x] Presets can be switched from the preset selector.
- [x] Preset packages are visible and selectable.
- [x] Formula and cask search uses the generated package index.
- [x] Browser access fetches only this site's `/package-index.json`, not Homebrew API URLs.
- [x] Unknown, deprecated, and disabled package warnings are displayed.
- [x] Disabled package download uses an in-app confirmation dialog.
- [x] Brewfile download reflects selection changes.
- [x] Brewfile download works and uses `Brewfile` as the suggested filename.
- [x] Install commands are visible and copyable.

## Import And Export

- [x] File import accepts one text Brewfile.
- [x] Global drag and drop accepts one text Brewfile.
- [x] Parsed import results support replace and merge.
- [x] Complex or optioned lines are preserved as passthrough.
- [x] Export order is stable: `tap`, `brew`, `cask`, `mas`, passthrough.

## State And Sharing

- [x] localStorage autosave works after edits.
- [x] Root route `/` offers previous-work restore.
- [x] Explicit preset route offers previous-work restore without automatic restore.
- [x] Explicit preset route does not clobber previous localStorage work before the user chooses restore or discard.
- [x] Share URL restores selected `tap`, `brew`, and `cask` entries.
- [x] Share URL omits `mas`, raw, and passthrough lines.
- [x] Share URL wins over route/localStorage during initial load.

## Build And Metadata

- [x] `public/package-index.json` is ignored by Git.
- [x] Homebrew raw JSON is not committed.
- [x] Fixture CI does not call Homebrew APIs.
- [x] Deploy workflow generates the real package index before build.
- [x] Package index size check warns above 10 MiB and fails above 20 MiB.
- [x] Preset validation accepts formula aliases such as `python`.

## Remaining Before Real Use

- [ ] Replace placeholder `lab-2026` package list with the real lab package set.
- [ ] Confirm the first public `pages.dev` deployment.
- [ ] Run the browser smoke checklist on at least Chrome and Safari.
- [ ] Decide whether `miz7.net` should be attached after the initial `pages.dev` release.
