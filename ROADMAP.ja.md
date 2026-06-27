# Roadmap

日本語 | [English](ROADMAP.md)

この roadmap は、Brewfile Picker の今後の方向性を示すものです。
現在の公開URL:

```text
https://brewfile-picker.pages.dev
```

## 現在の状態

Brewfile Picker は、Homebrew パッケージを選択し、`Brewfile` を生成するための静的 Web アプリです。

現在の実装では、以下に対応しています。

- Cloudflare Pages での公開デプロイ
- `lab-2026` プリセットと空のプリセット
- 生成済み Homebrew package index を使った formula / cask 検索
- ブラウザ内での Brewfile 読み込み、編集、生成、ダウンロード
- `localStorage` を使ったローカル自動保存
- 選択済み `tap`, `brew`, `cask` 項目の共有URL
- `tap`, `brew`, `cask`, `mas`, raw entry の手動追加
- 日本語・英語のUI切り替えと、表示言語のブラウザ内保存
- 不明、deprecated、disabled パッケージの警告
- fixture の Homebrew メタデータを使う CI
- live package index を再生成する scheduled deploy

## 方針

- 初めての Mac セットアップや研究室の引き継ぎで使いやすい状態を保つ。
- 明確な理由がない限り、ブラウザ内で完結する挙動を優先する。
- クライアントから Homebrew API へ不要な直接アクセスをしない。
- 生成した Brewfile は、実行前に利用者が確認できるようにする。
- プリセットは便利な開始点として扱い、隠れた自動化にはしない。
- 当面は、アカウント、トラッキング、サーバー側のユーザーデータを避ける。

## 実現可能性の前提

- アプリは静的な Cloudflare Pages サイトとして動き続けることを前提にする。
- この roadmap を更新しない限り、Pages Functions、Workers KV、D1、R2、サーバー側のユーザーデータを必要とする機能は追加しない。
- 大きな package metadata は、Cloudflare Pages Free の制限内に収める。特に単一 asset 25 MiB、サイトあたり 20,000 files の制限を意識する。大きくなりすぎた場合は、別の storage service を追加する前に静的 index file の分割を優先する。
- 長期的な共有は、server-hosted shared state ではなく、ブラウザ保存またはファイル import/export を使う。
- custom domain は Cloudflare Pages Free でも実現可能だが、初期公開には必須ではない。

## 現在の重点

- オンボーディングで使われそうなブラウザで動作確認する。（なおわたしはMacを持っていないため、厳しい…。）
- `lab-2026` プリセットを、実際の研究室セットアップに役立つ正確な内容に保つ。
- 利用者向け・開発者向けのドキュメントを明確に保つ。
- 今後の変更を、focused PR としてレビューしやすくする。

## 近い将来

### Release Hardening

- Chrome と Safari で browser smoke checklist を実行する。
- よく使われるスマートフォン幅で mobile layout を確認する。特に選択中のパッケージ一覧とインストール手順周辺を見る。
- MVP から実利用に移るにつれて acceptance checklist を更新し続ける。

### Lab Preset

- 残っている placeholder 的なパッケージ選択を、実際の研究室オンボーディング用セットに置き換える。
- パッケージ数が増える場合は、lab preset をより分かりやすい section に分ける。
- preset 変更時の revision 更新ルールを決める。
- Homebrew の package name、alias、cask token が変わったときに preset を再確認する。

### User Experience

- 選択中パッケージ、インストール手順、ダウンロード操作のあいだのスクロール負担を引き続き減らす。
- ユーザーの意図が分かりづらい箇所の empty state や warning text を改善する。
- UI が落ち着いたら、README にスクリーンショットまたは短い visual walkthrough を追加する。
- Homebrew や terminal command に慣れていないユーザー向けに文言を見直す。
- homepage、tap、deprecation、replacement、disabled status を見られる小さな package detail view を検討する。

### Accessibility

- 主要なワークフローが keyboard-only navigation で使えることを確認する。
- 検索結果、選択中項目、ファイル名設定、インストール手順の focus order を確認する。
- 選択状態、折りたたみ操作、コピー buttons の screen reader label を確認する。
- visual design 変更後に color contrast を再確認する。
- 長い package name、長い raw line、狭い viewport での折り返しをテストする。

### Brewfile Import And Export

- よく使われる complex Brewfile lines への対応を改善しつつ、不明な行は安全に保持する。
- passthrough / raw entries を編集可能にすることを検討する。
- Brewfile import 時にコメントをどう保持するかを明確にする。
- preset、検索、manual entry、raw line から入ったパッケージの duplicate handling を見直す。
- Brewfile output ordering を安定して予測しやすい状態に保つ。

### Sharing And Persistence

- share URL を chat や email tool で扱いやすい長さに保つ。
- `mas` entries を share URL に含めるべきかを再検討する。
- 共有元 preset revision と現在の preset revision が一致しない場合の messaging を改善する。
- share URL に収まりにくい workflow 向けに、user-managed preset file の import/export を検討する。
- local autosave は保守的な挙動を保ち、shared URL や明示的な preset route が作業内容を予期せず上書きしないようにする。

### Package Index And Deploy

- `package-index.json` のサイズ推移を監視する。
- 結合済み index file が Cloudflare Pages の制限に近づく、または load time に影響し始めた場合は index split を再検討する。
- 検索や読み込みが遅くなる場合は、formula と cask の index artifact 分割を検討する。
- CI fixture checks は live Homebrew APIs に依存しない状態を保つ。
- scheduled index generation は、Homebrew infrastructure に配慮した低頻度に保つ。
- `pages.dev` release が安定した後、`miz7.net` custom domain を付けるか決める。

### Project Hygiene

- 外部 contributor が増えそうなら contribution guidance を追加する。
- recurring request の種類が見えてきたら issue templates を追加する。
- README は利用者向けに保ち、開発詳細は `docs/` に置く。
- third-party notices と Homebrew attribution を見える状態に保つ。
- open work が増えてきたら、roadmap items を issues にリンクする。

## Later

- `localStorage` または IndexedDB に保存する user-managed named presets
- YAML または JSON としての preset import/export
- 検索結果での richer package metadata 表示
- type、selected state、disabled state、deprecated state による package filtering
- production usage が定常化した後の release notes または changelog

## 当面やらないこと

- User accounts
- Server-side Brewfile storage
- Server-side user preset storage
- Pages Functions、Workers KV、D1、R2-backed persistence
- ブラウザからの package installation 実行
- クライアントから Homebrew APIs への直接アクセス
- Analytics、tracking、cookie-based behavior
- あらゆる Brewfile Ruby expression を structured editable data として扱うこと

## この Roadmap の使い方

メモ帳です。
