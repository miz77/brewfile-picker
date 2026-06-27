# Brewfile Picker

Brewfile Picker is a static web app for searching and selecting Homebrew packages, then creating and sharing a `Brewfile` from presets or an existing `Brewfile`.

This project is not affiliated with the Homebrew project. It uses Homebrew metadata to help users prepare a `Brewfile`; installing the generated file remains the user's responsibility.

## Current MVP Features

- Choose presets, including `lab-2026` and a blank Brewfile.
- Search formulae and casks from the generated Homebrew package index.
- Select packages and export a stable `Brewfile`.
- Import an existing Brewfile by file selection or drag and drop.
- Preserve complex Brewfile lines as passthrough.
- Add manual `brew`, `cask`, `tap`, `mas`, or raw passthrough entries.
- Configure the downloaded Brewfile filename.
- Save work in `localStorage`.
- Copy share links from selected `brew`, `cask`, and `tap` entries.

## Development

```sh
npm install
npm run update:index
npm run dev
```

The generated `public/package-index.json` is intentionally ignored by Git. It is a build/deploy artifact.

## Checks

```sh
npm run check
npm run lint
npm test
npm run validate:presets
npm run check:index
npm run build
```

For a PR-style local check that does not call the Homebrew API:

```sh
npm run ci:fixture
```

Fixture-based CI checks can be run without accessing the Homebrew API:

```sh
npm run update:index:fixture
npm run check:index:fixture
npm run validate:presets
npm run build
```

E2E tests use Playwright against the production preview:

```sh
npx playwright install --with-deps chromium
npm run build
npm run test:e2e
```

## Deployment

The deploy workflow generates `public/package-index.json`, validates it, builds `dist/`, and deploys that artifact to Cloudflare Pages. See [docs/deploy.md](docs/deploy.md).

Configure these GitHub repository secrets before enabling deployment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare Pages project name is `brewfile-picker`.

## Release Checks

- [Acceptance checklist](docs/acceptance-checklist.md)
- [Browser smoke checklist](docs/browser-smoke.md)

## Privacy

The app is designed to process imported Brewfiles in the browser. The MVP does not use user accounts, server-side storage, cookies, or custom analytics.
The public page loads the Devicon stylesheet from jsDelivr for the repository icon.

## Third-Party Notices

Package metadata is derived from the Homebrew Formulae JSON API. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for Homebrew-related notices and attribution.

## Acknowledgements

Thanks to the Homebrew maintainers and contributors for making Homebrew and its package metadata available to the community.

## License

MIT
