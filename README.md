# ChatJapan

日本の地図上でエリアを選択しながら、政府統計データをAIに質問できるチャットサービス。

## 機能

- **インタラクティブ地図** — MapLibre GL JS による日本地図。都道府県・市区町村レベルのエリア選択に対応
- **統計チャット** — 選択エリアのコンテキストを自動的にLLMへ渡してe-Stat統計データを回答
- **複数エージェントモード** — 標準 / マーケティングアナリスト / スライド生成（Marp形式）の3モード
- **マルチLLM対応** — OpenAI / Anthropic / Google を環境変数で切替
- **会話履歴保存** — Googleログイン時にセッション・メッセージをPostgreSQLへ保存
- **レスポンシブ** — デスクトップ（3カラム）とモバイル（タブ切替）の両レイアウト対応

## クイックスタート

```bash
# 依存パッケージのインストール
npm install

# 環境変数の設定（下記「環境変数」セクション参照）
cp .env.local.example .env.local  # ファイルが存在しない場合は手動で作成

# DBマイグレーション（Prisma）
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

`http://localhost:3000` でアプリが起動します。

## 環境変数

`.env.local` に以下を設定してください。

```env
# === 必須 ===

# e-Stat API キー（https://www.e-stat.go.jp/api/ で無料取得）
ESTAT_API_KEY="..."

# LLM プロバイダ設定（openai / anthropic / google）
LLM_PROVIDER="openai"
LLM_MODEL="gpt-4o"

# 選択したプロバイダのAPIキー（使用するものだけ設定すれば可）
OPENAI_API_KEY="..."
ANTHROPIC_API_KEY="..."
GOOGLE_GENERATIVE_AI_API_KEY="..."

# === ログイン機能を使う場合（任意） ===

# NextAuth シークレット（openssl rand -base64 32 で生成）
AUTH_SECRET="..."

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# データベース（Vercel Postgres または任意のPostgreSQL）
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."  # Prisma Accelerate 利用時

# Vercel KV（キャッシュ用、任意）
KV_URL="..."
KV_REST_API_URL="..."
KV_REST_API_TOKEN="..."
KV_REST_API_READ_ONLY_TOKEN="..."
```

> **ログインなしでも動作します。** 認証・DB・KV の設定を省略した場合、会話履歴は保存されませんが、チャット機能はすべて利用できます。

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド（`prisma generate` も実行される） |
| `npm run test` | テストをウォッチモードで実行 |
| `npm run test:run` | テストを1回実行 |
| `npm run lint` | ESLint 実行 |

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | システム構成・コンポーネント設計・LLMツール仕様・DBスキーマ |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | ディレクトリ構造・開発フロー・統計カテゴリの追加方法 |
| [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) | Vercel デプロイ・Google OAuth の詳細手順 |

## デプロイ

Vercel への自動デプロイを想定しています。`vercel.json` でリージョンを `hnd1`（東京）に固定済み。詳細は [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) を参照してください。
