# Brewfile Picker

日本語 | [English](README.md)

Brewfile Picker は、Homebrew パッケージを検索・選択し、必要な項目をまとめた `Brewfile` を生成するための静的 Web アプリです。

アプリを開く: https://brewfile-picker.pages.dev

このプロジェクトは Homebrew プロジェクトの公式プロジェクトではありません。Homebrew のパッケージメタデータを利用して `Brewfile` の作成を支援します。生成したファイルを確認し、実際にインストールする責任は利用者にあります。

## できること

- `研究室 2026` などのプリセット、または空の Brewfile から始められます。
- Homebrew の formulae と casks を検索できます。
- パッケージ行をクリックして、選択中の項目へ追加・解除できます。
- 既存の Brewfile をファイル選択またはドラッグ&ドロップで読み込めます。
- 複雑な Brewfile 行は passthrough entry として保持できます。
- 生成した Brewfile を、時刻付き・`Brewfile` 固定・任意名でダウンロードできます。
- 選択した `tap`, `brew`, `cask` 項目の共有リンクをコピーできます。
- 編集中の内容をブラウザ内に自動保存できます。
- アプリの表示言語を日本語・英語で切り替えられます。

## 基本的な使い方

1. https://brewfile-picker.pages.dev を開きます。
2. プリセットを選ぶか、`なし` を選んで空の状態から始めます。
3. パッケージを検索して、必要なものを選択します。
4. 既存の Brewfile をもとにしたい場合は、Brewfile を読み込みます。
5. 生成された Brewfile をダウンロードします。
6. 表示される Homebrew インストールコマンドと `brew bundle` コマンドを確認してから実行します。

## プライバシー

このアプリは、読み込んだ Brewfile をブラウザ内で処理する設計です。Brewfile の内容について、ユーザーアカウントやサーバー側の保存は使用しません。

公開ページでは、リポジトリアイコン表示のために jsDelivr から Devicon の stylesheet を読み込みます。

## 開発

開発環境のセットアップ、ローカルコマンド、チェック、package-index については [docs/development.md](docs/development.md) にまとめています。

Cloudflare Pages へのデプロイについては [docs/deploy.md](docs/deploy.md) を参照してください。

今後の方向性は [ROADMAP.ja.md](ROADMAP.ja.md) にまとめています。

## Third-Party Notices

パッケージメタデータは Homebrew Formulae JSON API に由来します。Homebrew に関する表記と帰属については [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

## 謝辞

Homebrew とそのパッケージメタデータを公開している Homebrew maintainers / contributors に感謝します。

## License

MIT
