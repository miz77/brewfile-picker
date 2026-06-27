# Development

This document covers local development for Brewfile Picker.

The public user-facing entry point is the repository [README](../README.md).

## Stack

- Svelte
- Vite
- TypeScript
- Tailwind CSS v4
- Valibot
- Vitest
- Playwright

## Local Setup

```sh
npm install
npm run update:index
npm run dev
```

`npm run update:index` generates `public/package-index.json` from Homebrew metadata.

The generated `public/package-index.json` is intentionally ignored by Git. It is a build/deploy artifact, not source.

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

The app is hosted on Cloudflare Pages:

```text
https://brewfile-picker.pages.dev
```

The deploy workflow generates `public/package-index.json`, validates it, builds `dist/`, and deploys that artifact to Cloudflare Pages. See [deploy.md](deploy.md).

Configure these GitHub repository secrets before enabling deployment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare Pages project name is `brewfile-picker`.

## Release Checks

- [Acceptance checklist](acceptance-checklist.md)
- [Browser smoke checklist](browser-smoke.md)
