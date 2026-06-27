# Roadmap

[日本語](ROADMAP.ja.md) | English

This roadmap describes possible future directions for Brewfile Picker.

The current public app is hosted at:

```text
https://brewfile-picker.pages.dev
```

## Current Status

Brewfile Picker is a static web app for choosing Homebrew packages and generating a `Brewfile`.

The current implementation supports:

- A public Cloudflare Pages deployment.
- A `lab-2026` preset and an empty preset.
- Formula and cask search from a generated Homebrew package index.
- Browser-only Brewfile import, editing, generation, and download.
- Local autosave using `localStorage`.
- Share URLs for selected `tap`, `brew`, and `cask` entries.
- Manual `tap`, `brew`, `cask`, `mas`, and raw entry additions.
- Warnings for unknown, deprecated, and disabled packages.
- CI checks with fixture Homebrew metadata.
- Scheduled deploys that regenerate the live package index.

## Product Principles

- Keep the app useful for first-time Mac setup and lab handoff workflows.
- Prefer browser-only behavior unless a server-side feature has a clear reason to exist.
- Avoid unnecessary direct traffic from clients to Homebrew APIs.
- Keep generated Brewfiles inspectable before users run install commands.
- Treat presets as helpful starting points, not hidden automation.
- Avoid accounts, tracking, and server-side user data for the foreseeable future.

## Feasibility Assumptions

- The app should continue to work as a static Cloudflare Pages site.
- Future features should not require Pages Functions, Workers KV, D1, R2, or server-side user data unless this roadmap is updated first.
- Large package metadata should stay within Cloudflare Pages Free limits, including the 25 MiB single-asset limit and 20,000-file site limit; if it grows too large, prefer splitting static index files before adding a separate storage service.
- Longer-lived sharing should use browser storage or file import/export rather than server-hosted shared state.
- A custom domain is feasible on Cloudflare Pages Free, but it is not required for the initial public release.

## Current Focus

- Confirm the app works on the browsers most likely to be used during onboarding. Note that I do not have a Mac, so this will be difficult.
- Keep the `lab-2026` preset useful and accurate for real lab setup.
- Keep documentation clear for both users and contributors.
- Make future changes easy to review through focused PRs.

## Near Term

### Release Hardening

- Run the browser smoke checklist on Chrome and Safari.
- Check the mobile layout around common phone widths, especially around the selected package list and install instructions.
- Keep the acceptance checklist current as the release moves from MVP to real use.

### Lab Preset

- Replace any remaining placeholder package choices with the real lab onboarding set.
- Split the lab preset into clearer sections if the package list grows.
- Decide a revision update rule for preset changes.
- Re-check the preset when Homebrew package names, aliases, or cask tokens change.

### User Experience

- Continue reducing scroll friction between selected packages, install instructions, and download actions.
- Improve empty states and warning text where user intent may be unclear.
- Add a screenshot or short visual walkthrough to the README when the UI settles.
- Review copy for users who are unfamiliar with Homebrew or terminal commands.
- Consider a small package detail view for homepage, tap, deprecation, replacement, and disabled status.

### Accessibility

- Confirm the main workflow works with keyboard-only navigation.
- Check focus order across search results, selected items, filename settings, and install instructions.
- Verify screen reader labels for selection state, collapse controls, and copy buttons.
- Re-check color contrast after visual design changes.
- Test long package names, long raw lines, and narrow viewport wrapping.

### Brewfile Import And Export

- Improve support for common complex Brewfile lines while preserving unknown lines safely.
- Consider editable passthrough/raw entries.
- Clarify how comments should be preserved when importing a Brewfile.
- Review duplicate handling for packages imported from presets, search, manual entries, and raw lines.
- Keep Brewfile output ordering stable and predictable.

### Sharing And Persistence

- Keep share URLs compact enough for chat and email tools.
- Revisit whether `mas` entries should ever be included in share URLs.
- Improve messaging when shared preset revisions do not match the current preset.
- Consider import/export of user-managed preset files for workflows that do not fit comfortably in a share URL.
- Keep local autosave behavior conservative so shared URLs and explicit preset routes do not unexpectedly overwrite work.

### Package Index And Deploy

- Monitor `package-index.json` size over time.
- Revisit index splitting if the combined file approaches Cloudflare Pages limits or starts to hurt load time.
- Consider separate formula and cask index artifacts if search or loading becomes slow.
- Keep CI fixture checks independent from live Homebrew APIs.
- Keep scheduled index generation at a low frequency that is respectful to Homebrew infrastructure.
- Decide whether a `miz7.net` custom domain should be attached after the `pages.dev` release is stable.

### Project Hygiene

- Add contribution guidance if outside contributors become likely.
- Add issue templates once recurring request types are clear.
- Keep README user-focused and keep development details in `docs/`.
- Keep third-party notices and Homebrew attribution visible.
- Keep roadmap items linked to issues once the project has enough open work to justify it.

## Later

- User-managed named presets stored in the browser with `localStorage` or IndexedDB.
- Preset import and export as YAML or JSON.
- Optional multi-language UI if non-Japanese usage becomes likely.
- Richer package metadata in search results.
- Better package filtering by type, selected state, disabled state, and deprecated state.
- More formal release notes or changelog once production usage becomes regular.

## Non-Goals For Now

- User accounts.
- Server-side Brewfile storage.
- Server-side user preset storage.
- Pages Functions, Workers KV, D1, or R2-backed persistence.
- Browser-triggered package installation.
- Client-side direct calls to Homebrew APIs.
- Analytics, tracking, or cookie-based behavior.
- Supporting every possible Brewfile Ruby expression as structured editable data.

## How To Use This Roadmap

This is a scratchpad.
