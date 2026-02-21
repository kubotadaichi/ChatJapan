# 会話履歴DB保存 設計ドキュメント

**日付:** 2026-02-21
**ステータス:** 承認済み

## 概要

ログインユーザーの会話履歴を Vercel Postgres + Prisma で永続化する。サイドバーに過去セッション一覧を表示し、セッションを復元できる。レイアウトを3カラム（サイドバー | 地図 | チャット）に変更し、`react-resizable-panels` でドラッグリサイズを実装する。

## アーキテクチャ方針

- **保存方式**: API保存型 — `useChat` の `onFinish` コールバックで別APIへ保存リクエスト
- **対象ユーザー**: ログインユーザーのみ（Google OAuth、next-auth v4）
- **DB**: Vercel Postgres + Prisma（型安全、マイグレーション管理）
- **タイトル**: LLM自動生成（最初のAI応答完了後に非同期で `generateText`）

## データモデル

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

model User {
  id        String        @id @default(cuid())
  email     String        @unique
  name      String?
  image     String?
  sessions  ChatSession[]
  createdAt DateTime      @default(now())
}

model ChatSession {
  id        String        @id @default(cuid())
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  title     String?       // LLMで自動生成。最初はnull
  areaName  String?       // 最後に選択したエリア名
  areaCode  String?       // 最後に選択したエリアコード
  messages  ChatMessage[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([userId, createdAt(sort: Desc)])
}

model ChatMessage {
  id        String      @id @default(cuid())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String      // "user" | "assistant"
  content   String      // UIMessage.parts から type==="text" を結合
  areaCode  String?     // メッセージ時点の選択エリア
  areaName  String?
  createdAt DateTime    @default(now())

  @@index([sessionId, createdAt])
}
```

**設計上の注意:**
- `ChatMessage.content` はテキストコンテンツのみ（ツール呼び出し中間ステップは除外）
- next-auth セッションの `email` をキーに `User.email` と紐付け

## API エンドポイント

| エンドポイント | メソッド | 用途 |
|---|---|---|
| `/api/sessions` | GET | セッション一覧取得（サイドバー表示用） |
| `/api/sessions` | POST | 新規セッション作成 |
| `/api/sessions/[id]` | GET | セッションのメッセージ取得（復元用） |
| `/api/sessions/[id]` | PATCH | タイトル更新（LLM生成後） |
| `/api/sessions/[id]` | DELETE | セッション削除 |
| `/api/sessions/[id]/messages` | POST | メッセージ一括保存 |

すべてのAPIで `getAuthSession()` 認証チェック。未ログインは 401。

### 保存フロー

```
1. ユーザーが最初のメッセージを送信
   → ChatPanel: POST /api/sessions → sessionId 取得
   → sessionId を state に保存

2. sendMessage() でストリーミング開始

3. onFinish(message) コールバック
   → POST /api/sessions/[id]/messages
     { role: "user", content: ..., areaCode, areaName }
     { role: "assistant", content: ..., areaCode, areaName }

4. messages.length === 2 かつ role === "assistant" のとき
   → generateText() でタイトル生成（非同期、ブロックしない）
   → PATCH /api/sessions/[id] { title }
   → サイドバーの一覧を再フェッチ

5. 既存セッションへの追加メッセージ
   → セッション作成スキップ、onFinish で直接保存
```

## UI レイアウト変更

### 3カラムレイアウト（react-resizable-panels 使用）

```
┌─────────────────────────────────────────────────────────────┐
│ [セッションサイド]  ‖  [地図パネル]           ‖  [チャット] │
│  (200px デフォルト)    (flex-1)                  (480px)    │
│  ─────────────────                               ──────────  │
│  ＋ 新しい会話         MapLibre GL                ChatPanel │
│  ─────────────────     日本地図                             │
│  📍 渋谷区の人口                                             │
│  📍 新宿区の商業                                             │
│  📍 大阪府の経済                                             │
│  （ログイン時のみ）                                          │
└─────────────────────────────────────────────────────────────┘
```

- **ログイン時**: 3カラム（サイドバー | 地図 | チャット）
- **未ログイン時**: 2カラム（地図 | チャット）
- **パネルリサイズ**: `react-resizable-panels` の `PanelGroup + Panel + PanelResizeHandle`
- サイドバーの最小幅: 160px、最大幅: 320px
- チャットパネルの最小幅: 320px

### 新規コンポーネント

- `src/components/layout/ThreeColumnLayout.tsx` — `react-resizable-panels` ベース
- `src/components/session/SessionSidebar.tsx` — セッション一覧、新規作成ボタン
- `src/components/session/SessionItem.tsx` — 個別セッション行（タイトル、削除ボタン）

### 既存コンポーネントの変更

- `src/app/page.tsx` — セッション状態管理を追加
- `src/components/chat/ChatPanel.tsx` — `sessionId` prop 追加、`onFinish` コールバック追加

## テスト戦略

| 対象 | テスト方法 |
|---|---|
| Prismaクライアント操作 | `prisma.$queryRaw` + ロールバックパターン |
| `/api/sessions` | vitest + `Request` モックで認証チェック |
| `/api/sessions/[id]/messages` | メッセージ保存・取得のユニットテスト |
| `SessionSidebar` | `render` + MSW でAPIレスポンスモック |
| `ThreeColumnLayout` | リサイズハンドル存在確認 |

## 新規依存パッケージ

```bash
npm install @prisma/client prisma @vercel/postgres
npm install react-resizable-panels
npm install -D prisma
```

## 環境変数

```bash
# .env.local に追加
POSTGRES_PRISMA_URL="postgres://..."   # Vercel Postgresダッシュボードから
POSTGRES_URL_NON_POOLING="postgres://..."
```

## 実装の順番

1. Prisma セットアップ + スキーマ作成
2. DB操作ユーティリティ (`src/lib/db/`)
3. API Routes (`/api/sessions`)
4. `react-resizable-panels` への移行
5. `SessionSidebar` コンポーネント
6. `ChatPanel` の保存フロー統合
7. タイトル自動生成
