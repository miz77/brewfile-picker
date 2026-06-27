# Browser Smoke Checklist

Run after `npm run build` and `npm run preview`.

Target browsers:

- Chrome or Chromium
- Safari
- Firefox
- Edge

Minimum checks:

- [ ] Open `/p/lab-2026`.
- [ ] Confirm package-index status changes to loaded.
- [ ] Uncheck `git` and confirm the downloaded Brewfile removes `brew "git"`.
- [ ] Search for `zotero` and add it.
- [ ] Select a Brewfile from disk.
- [ ] Drag and drop a Brewfile onto the page, then replace or merge the parsed result.
- [ ] Add a `tap` from Advanced add.
- [ ] Add a `mas` item from Advanced add.
- [ ] Add a raw line from Advanced add.
- [ ] Copy a share link and open it in a new tab.
- [ ] Reload `/` and restore localStorage state.
- [ ] Download with timestamped, plain, and custom filenames and inspect the file contents.
- [ ] Copy install commands.
- [ ] Check the mobile layout around 390px width.
- [ ] Confirm no cookie or analytics prompt appears.
