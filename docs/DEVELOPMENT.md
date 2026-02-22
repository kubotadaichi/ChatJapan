# 開発ガイド

## ディレクトリ構造

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          NextAuth ハンドラ・ユーザーupsert
│   │   ├── chat/          LLMストリーミングAPI（メイン）
│   │   ├── geojson/       市区町村GeoJSONプロキシ（GitHub API経由）
│   │   ├── sessions/      会話セッションCRUD
│   │   └── statistics/    統計データエンドポイント（予備）
│   ├── layout.tsx         ルートレイアウト（ThemeProvider, AuthProvider, Header）
│   └── page.tsx           メインページ
│
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx          チャットUI全体
│   │   ├── ChatInput.tsx          入力欄 + エージェントモード選択
│   │   ├── MessageList.tsx        メッセージ一覧（ストリーミング対応）
│   │   ├── AgentModeSelector.tsx  モード切替ボタン
│   │   └── CategoryCoverageChips.tsx  統計カバレッジ表示
│   ├── layout/
│   │   ├── Header.tsx             ヘッダー（ログイン/ログアウト, テーマ切替）
│   │   ├── ThreeColumnLayout.tsx  デスクトップ3カラム
│   │   ├── MobileLayout.tsx       モバイルレイアウト
│   │   ├── MobileTabBar.tsx       モバイル下部タブ
│   │   └── SplitLayout.tsx        汎用スプリットレイアウト
│   ├── map/
│   │   └── MapPanel.tsx           MapLibre GL 地図パネル
│   ├── onboarding/
│   │   └── OnboardingModal.tsx    初回起動時モーダル
│   ├── providers/
│   │   ├── AuthProvider.tsx       NextAuth SessionProvider
│   │   └── ThemeProvider.tsx      next-themes プロバイダ
│   ├── session/
│   │   └── SessionSidebar.tsx     会話履歴サイドバー
│   └── ui/                        shadcn/ui コンポーネント
│
├── hooks/
│   ├── useMapSelection.ts         エリア選択ステート管理
│   └── useSessionManager.ts       会話セッション管理（API連携）
│
└── lib/
    ├── auth.ts                    NextAuth 設定（authOptions, getAuthSession）
    ├── db/                        Prisma クライアント初期化
    ├── estat/
    │   ├── client.ts              EStatClient クラス（API呼び出し・正規化）
    │   └── categories.ts          統計カテゴリ定義
    ├── llm/
    │   ├── tools.ts               LLM ツール定義（createStatisticsTools）
    │   └── prompts.ts             システムプロンプト（getSystemPrompt）
    ├── types.ts                   共通型定義
    └── utils.ts                   汎用ユーティリティ
```

---

## テスト

[Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) を使用しています。

```bash
npm run test      # ウォッチモード
npm run test:run  # CI向け1回実行
npm run test:ui   # ブラウザUIで確認
```

テストファイルは実装ファイルと同じディレクトリに `*.test.ts(x)` として配置します。

```
src/
├── hooks/
│   ├── useMapSelection.ts
│   └── useMapSelection.test.ts   ← 同ディレクトリ
├── lib/estat/
│   ├── client.ts
│   └── client.test.ts
```

### テスト対象

現在テストがある主なファイル:

| ファイル | テスト内容 |
|---------|-----------|
| `useMapSelection.test.ts` | エリア選択・トグル・市区町村モード切替 |
| `useSessionManager.test.ts` | セッション操作ロジック |
| `client.test.ts` | `normalizeAreaCode`・`buildClassMap` |
| `categories.test.ts` | `getCategoryById` |
| `tools.test.ts` | ツール定義の存在確認 |
| `prompts.test.ts` | プロンプト生成 |
| `ChatPanel.test.tsx` | レンダリング・基本インタラクション |
| `MapPanel.test.tsx` | レンダリング（MapLibre はモック） |

---

## 統計カテゴリの追加

`src/lib/estat/categories.ts` に1エントリ追加するだけでLLMが自動的に活用します。

```typescript
// src/lib/estat/categories.ts
export const STATISTICS_CATEGORIES: StatisticsCategory[] = [
  // ... 既存エントリ ...
  {
    id: 'housing',                        // ユニークなID（英小文字）
    name: '住宅・土地統計',
    description: '住宅数・空き家率・土地所有状況など',
    statsIds: ['0003190548'],             // e-Stat 統計表ID（複数可）
    coverage: 'municipality',             // 'municipality' | 'prefecture' | 'mixed'
  },
]
```

**統計表IDの調べ方:**
1. [e-Stat](https://www.e-stat.go.jp/stat-search) でキーワード検索
2. または `searchStatsList` ツール（チャットから `LLM_PROVIDER=openai npm run dev` で起動後、チャットで「住宅統計を検索して」と入力）

`coverage` の設定:
- `"municipality"` — 市区町村データあり（フォールバック対象）
- `"prefecture"` — 都道府県のみ（フォールバック不要）
- `"mixed"` — 同一統計表に両レベル含む（`fetchStatistics` が自動判別）

---

## LLMプロバイダの切替

`.env.local` の2変数を変えるだけです。コード変更は不要です。

```env
# OpenAI
LLM_PROVIDER="openai"
LLM_MODEL="gpt-4o"

# Anthropic
LLM_PROVIDER="anthropic"
LLM_MODEL="claude-sonnet-4-6"

# Google
LLM_PROVIDER="google"
LLM_MODEL="gemini-2.0-flash"
```

---

## @ai-sdk/react v3 の注意事項

このプロジェクトは @ai-sdk/react **v3**（破壊的変更あり）を使用しています。

| 廃止されたAPI | 代替 |
|-------------|------|
| `useChat({ api, body })` | `useChat({ transport: new DefaultChatTransport({ api, body }) })` |
| `input`, `handleInputChange`, `handleSubmit` | 自前の `useState` + `sendMessage({ text: input })` |
| `isLoading` | `status === 'submitted' \| 'streaming'` |
| `Message` 型 | `UIMessage` 型 |
| `message.content` (string) | `message.parts` 配列（`type === 'text'` のpartから取得） |

`ai` パッケージ側の変更:
- `tool({ parameters })` → `tool({ inputSchema })`
- `maxSteps: N` → `stopWhen: stepCountIs(N)`
- `result.toDataStreamResponse()` → `result.toUIMessageStreamResponse()`

---

## コーディング規約

- **TypeScript strict mode** — `tsconfig.json` で `strict: true`
- **パス alias** — `@/` が `src/` に対応（`tsconfig.json` の `paths` 設定）
- **スタイル** — Tailwind CSS v4 + shadcn/ui。カスタムCSSは `globals.css` のみ
- **コンポーネント** — `"use client"` を明示。サーバーコンポーネントとクライアントコンポーネントを明確に分離
- **API Routes** — `src/app/api/` 配下。Next.js App Router の Route Handlers を使用
- **エラーハンドリング** — LLMツール内でのエラーは `{ error: string }` を返してLLMに判断させる（例外を上に伝播しない）
