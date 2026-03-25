# SVN Client

macOS 向けの SVN (Subversion) デスクトップクライアント。

Electron + React + TypeScript で構築。システムの `svn` コマンドをバックエンドとして使用します。

## 機能

- **リポジトリブラウジング** — URL を指定してリポジトリ内をナビゲーション。ファイルクリックで macOS の適切なアプリで開く
- **変更管理** — 作業コピーの変更状態一覧、ファイル差分のインライン表示
- **コミット & リバート** — ファイル選択してのコミット、個別/一括リバート、`svn add`
- **ログ閲覧** — リビジョン履歴の一覧表示、リビジョンごとの差分確認
- **マージ** — ブランチ全体のマージ、リビジョン範囲指定マージ
- **チェリーピック** — ログからリビジョンを複数選択してマージ、ドライラン（プレビュー）対応

## 前提条件

- macOS
- Node.js 20+
- `svn` コマンドがパスに通っていること（`brew install svn` 等）

## セットアップ

```bash
npm install
```

## 起動

```bash
# プロダクションビルド → 起動
npm start

# 開発モード（ホットリロード付き）
npm run dev
```

## ビルド

```bash
# コンパイルのみ
npm run build

# macOS 用 .dmg パッケージ作成
npm run dist
```

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Electron |
| UI | React + TypeScript |
| バンドラー | Vite |
| SVN 操作 | `svn` CLI (XML 出力パース) |
| テーマ | Catppuccin Mocha |
