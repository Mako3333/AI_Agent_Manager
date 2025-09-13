# AI Agent Manager

Next.js 14 + TypeScript + Tailwind で構築された、コンサル型AIの対話 UI とワークフロー（Pain 分析 → ソリューション設計 → エージェント生成）を備えたアプリです。OpenAI の Chat Completions をストリーミングで利用します。

## 必要条件
- Node.js 18 以上（LTS 推奨）
- pnpm（推奨）

## セットアップ
1) 依存関係のインストール
```
pnpm install
```
2) 環境変数の設定
```
cp .env.local.sample .env.local
# .env.local を編集して OPENAI_API_KEY を設定
```
3) 開発サーバー起動
```
pnpm dev
# http://localhost:3000 にアクセス
```

## スクリプト
- `pnpm dev` ローカル開発サーバーを起動
- `pnpm build` 本番ビルドを作成（`.next/`）
- `pnpm start` 本番ビルドを起動
- `pnpm lint` Next.js ルールでの ESLint 実行

## プロジェクト構成
- `app/` Next.js App Router（`page.tsx`、`layout.tsx`、`app/api/chat/route.ts` など）
- `components/` 機能別/共通 UI（`components/ui/*` は shadcn 由来のプリミティブ）
- `hooks/` カスタムフック（例: `use-workflow.ts`）
- `lib/` ユーティリティとコアロジック（例: `workflow-engine.ts`）
- `styles/` グローバル CSS（Tailwind）
- `public/` 静的アセット

## 環境変数
- `OPENAI_API_KEY` 必須。`app/api/chat/route.ts` で OpenAI にアクセスします。
- （任意）`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` は Cloud Run デプロイ UI の例で使用。
`.env*` は `.gitignore` 済みのため、秘密情報は安全に管理してください。

## 開発メモ（ストリーミング仕様）
- サーバー: `app/api/chat/route.ts` が OpenAI（`gpt-4o-mini`）にストリーミングで接続し、`0:{...}` 形式の行でクライアントへ転送します（`type: "text-delta"`）。
- クライアント: `components/chat-interface.tsx` が上記フォーマットを前提に UI を逐次更新します。プロトコル変更時は両者を同時に更新してください。

## デプロイ
- Vercel 推奨。プロジェクト設定で `OPENAI_API_KEY` を追加してください。
- Cloud Run 用の UI（`components/cloud-run-deployment.tsx`）はモック挙動です。実運用では CI/CD とマニフェスト管理を整備してください。
