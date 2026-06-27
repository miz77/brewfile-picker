# Brewfile Picker

[日本語](README.ja.md) | English

Brewfile Picker is a static web app for searching Homebrew packages, selecting the packages you need, and generating a `Brewfile`.

Open the app: https://brewfile-picker.pages.dev

This project is not affiliated with the Homebrew project. It uses Homebrew package metadata to help users prepare a `Brewfile`; installing the generated file remains the user's responsibility.

## What You Can Do

- Start from a preset such as `研究室 2026`, or from an empty Brewfile.
- Search Homebrew formulae and casks.
- Click package rows to add or remove them from the selected list.
- Import an existing Brewfile by file selection or drag and drop.
- Keep complex Brewfile lines as passthrough entries.
- Download the generated Brewfile with a timestamped, plain, or custom filename.
- Copy a share link for selected `tap`, `brew`, and `cask` entries.
- Keep edits in the browser with local autosave.
- Switch the app UI between Japanese and English.

## Basic Usage

1. Open https://brewfile-picker.pages.dev.
2. Choose a preset, or choose `なし` to start empty.
3. Search for packages and select the ones you need.
4. Import an existing Brewfile if you want to use it as a starting point.
5. Download the generated Brewfile.
6. Review the displayed Homebrew install and `brew bundle` commands before running them.

## Privacy

The app is designed to process imported Brewfiles in the browser. It does not use user accounts or server-side storage for Brewfile contents.

The public page loads the Devicon stylesheet from jsDelivr for the repository icon.

## Development

Developer setup, local commands, checks, and package-index notes are documented in [docs/development.md](docs/development.md).

Deployment details for Cloudflare Pages are documented in [docs/deploy.md](docs/deploy.md).

Possible future directions are documented in [ROADMAP.md](ROADMAP.md).

## Third-Party Notices

Package metadata is derived from the Homebrew Formulae JSON API. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for Homebrew-related notices and attribution.

## Acknowledgements

Thanks to the Homebrew maintainers and contributors for making Homebrew and its package metadata available to the community.

## License

MIT
