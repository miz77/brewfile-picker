# Deployment

The app is a static Vite build deployed to Cloudflare Pages.

## Cloudflare Pages Project

The deploy workflow creates the Pages project if it does not already exist:

```text
brewfile-picker
```

The first public URL is expected to be:

```text
https://brewfile-picker.pages.dev
```

The MVP does not require a custom domain. A `miz7.net` subdomain can be attached later.

## GitHub Secrets

Add these repository secrets before enabling the deploy workflow:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The token needs permission to deploy to Cloudflare Pages for the target account/project.

## Workflows

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`.

It uses fixture Homebrew metadata:

```sh
npm run update:index:fixture
npm run check:index:fixture
npm run validate:presets
npm run check
npm test
npm run build
npm run test:e2e
```

`.github/workflows/deploy.yml` runs on `main`, daily schedule, and manual dispatch.

It uses live Homebrew metadata:

```sh
npm run update:index
npm run check:index
npm run validate:presets
npm run build
```

Then it checks the Cloudflare Pages project through the Cloudflare API and creates it when missing:

```sh
GET /accounts/{account_id}/pages/projects/brewfile-picker
POST /accounts/{account_id}/pages/projects
```

Finally, it deploys `dist/` with:

```sh
pages deploy dist --project-name=brewfile-picker --commit-dirty=true
```

## Local Release Check

Before the first deploy:

```sh
npm ci
npm run update:index
npm run check:index
npm run validate:presets
npm run check
npm test
npm run build
npm run test:e2e
```

`public/package-index.json` and `dist/` must remain uncommitted build artifacts.
