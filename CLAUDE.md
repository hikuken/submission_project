# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**提出物管理システム** - 動的フォームを使用して提出物を収集・管理するモダンなフルスタックWebアプリケーション（調整さんのような仕組み）

**技術スタック:**
- フロントエンド: React 19 + TypeScript + Vite + Tailwind CSS
- バックエンド: Convex（リアルタイムデータベース + サーバーレス関数）
- 認証: Convex Auth（匿名認証対応）
- ストレージ: Convex Storage（画像アップロード用）

## 開発コマンド

```bash
# メイン開発コマンド - フロントエンドとバックエンドを同時起動
npm run dev

# 個別サービス起動（必要時のみ）
npm run dev:frontend    # Vite開発サーバー（自動ブラウザ起動）
npm run dev:backend     # Convexバックエンドのみ

# ビルド・検証
npm run lint           # TypeScriptコンパイル + Convex検証 + Viteビルド
```

## アーキテクチャ概要

### アプリケーションフロー
1. **管理者が収集を作成** → 管理用URLと提出用URLを取得
2. **提出者が提出用URLにアクセス** → 動的フォームに入力
3. **管理者が管理用URLで監視** → 提出状況確認、データエクスポート

### ディレクトリ構造
- `src/` - React フロントエンド（React Router DOMでルーティング）
- `convex/` - バックエンド関数、スキーマ、認証
- `convex/schema.ts` - データベーステーブル: aggregations, submissionItems, submissions, submitters

### 主要コンポーネント
- `Home.tsx` - 収集作成インターフェース
- `Admin.tsx` - 収集管理・監視画面
- `Submission.tsx` - 提出者向け動的フォーム
- `SignInForm.tsx` / `SignOutButton.tsx` - 認証UI

### データベーススキーマ
- **aggregations**: 収集のメタデータとランダムアクセスURL
- **submissionItems**: 動的フォームフィールド定義（テキスト、数値、画像、リスト）
- **submissions**: 実際の提出データ（柔軟なレスポンス格納）
- **submitters**: 収集ごとの提出許可者リスト

## アクセス制御パターン

**URLベースのアクセス制御**（ランダムURL使用）:
- 管理用URL: `/admin/:adminUrl` - 収集管理用
- 提出用URL: `/submit/:submissionUrl` - フォーム提出用
- 収集にオプションでパスワード保護可能

## 開発パターン

### スタイリング
- Tailwind CSS（`tailwind.config.js`でカスタムテーマ設定）
- カスタムカラーパレット: primary (#4F46E5), secondary (#6B7280), accent (#8B5CF6)
- パスエイリアス: `@/` → `src/`

### 状態管理
- Convex Reactフック（useQuery, useMutation）でリアルタイムデータ
- UI操作用のローカルReact状態
- 接続クライアント全体でリアルタイム更新

### ファイル処理
- Convex Storageによる画像アップロード
- 提出画像の一括ダウンロード機能
- 提出データのCSVエクスポート

### エラーハンドリング
- Sonnerライブラリによるトースト通知
- エラーバウンダリと適切なTypeScriptエラーハンドリング

## 重要な設定

### Convex設定
- デプロイメント: `doting-chinchilla-259`
- `convex/auth.config.ts`で匿名認証有効
- `convex/router.ts`でファイルダウンロード用HTTPルート定義

### ビルド設定
- Vite（Reactプラグイン・パスエイリアス設定）
- ESLint（TypeScript対応、開発しやすいよう緩和されたルール）
- components.json（shadcn/ui用、New Yorkスタイル設定）

## テスト・検証

コミット前に必ず `npm run lint` を実行 - 以下を検証:
1. TypeScriptコンパイル
2. Convexスキーマ・関数検証
3. Viteビルドプロセス

## 国際化について

アプリケーションのインターフェースとドキュメントは主に日本語です。要件定義書（`要件定義.md`）と設計書（`設計書.md`）も日本語で記載されています。

## 開発手順
以下の手順で開発進める
1. mainブランチから新規ブランチを作成し、新規ブランチで実装
2. 実装完了したら、mainブランチに向けてPull Request作成