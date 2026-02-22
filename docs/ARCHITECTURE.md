# アーキテクチャ

## システム全体像

```
┌─────────────── ブラウザ (Next.js App Router) ────────────────┐
│                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │ SessionSidebar│   │  MapPanel    │    │   ChatPanel     │  │
│  │ (会話履歴)   │   │ (MapLibre GL)│    │ (AI SDK useChat)│  │
│  └─────────────┘    └──────────────┘    └────────┬────────┘  │
│         │                 │                       │           │
│  useSessionManager   useMapSelection    DefaultChatTransport  │
└──────────────────────────────────────────────────┼───────────┘
                                                   │ POST /api/chat
┌─────────────── サーバー (Next.js API Routes) ────┼───────────┐
│                                                   │           │
│         ┌──────────────────────────────┐          │           │
│         │      /api/chat/route.ts      │◄─────────┘           │
│         │  streamText (Vercel AI SDK)  │                       │
│         │  LLM Tool Calling (最大5ステップ)                    │
│         └────────────┬─────────────────┘                      │
│                      │                                         │
│          ┌───────────┴────────────┐                           │
│          ▼                        ▼                           │
│   ┌─────────────┐        ┌──────────────┐                    │
│   │ EStatClient │        │  /api/sessions│                    │
│   │ (e-Stat API)│        │  /api/auth    │                    │
│   └─────────────┘        └──────┬───────┘                    │
└──────────────────────────────────┼────────────────────────────┘
                                   │
┌──────────────────── データ ───────┼────────────────────────────┐
│  PostgreSQL (Prisma)              │  e-Stat API (外部)          │
│  - User / ChatSession / ChatMessage│  - 国勢調査                │
│                                   │  - 商業統計                 │
│  Vercel KV (Redis)                │  - 経済センサス             │
│  - 統計APIレスポンスキャッシュ    │                             │
└───────────────────────────────────────────────────────────────┘
```

## コンポーネント構成

### ページ (`src/app/page.tsx`)

メインページはステートを保持するだけで、UIを4つのコンポーネントに委譲します。

```
page.tsx
├── useMapSelection()      ← 選択エリア・選択モード管理
├── useSessionManager()    ← 会話セッション管理
├── ThreeColumnLayout      ← デスクトップ（md以上）
│   ├── SessionSidebar
│   ├── MapPanel
│   └── ChatPanel
└── MobileLayout           ← モバイル（md未満）
    ├── SessionSidebar
    ├── MapPanel
    └── ChatPanel
```

### 地図 (`src/components/map/MapPanel.tsx`)

- **GeoJSONソース**: [niiyz/JapanCityGeoJson](https://github.com/niiyz/JapanCityGeoJson)
- 都道府県モード: `geojson/prefectures/NN.json` → `promoteId='id'`
- 市区町村モード: `geojson/NN/NNNNN.json` を GitHub Contents API で一覧取得後、`Promise.all` で並列フェッチ
- ハイライトは `setFeatureState` で実装（再レンダリングなし）
- 右クリックでコンテキストメニュー（市区町村モード切替）

**重要な注意点:** `geojson/prefectures/NN.json` は1フィーチャー（都道府県境界のみ）なので市区町村ハイライトには使えません。市区町村モードでは必ず `geojson/NN/NNNNN.json` の個別ファイルを使います。

### チャット (`src/components/chat/ChatPanel.tsx`)

@ai-sdk/react v3 の `useChat` を使用。`DefaultChatTransport` でAPIエンドポイントと選択エリアを渡します。

```typescript
const transport = new DefaultChatTransport({
  api: '/api/chat',
  body: { selectedAreas, agentMode },
})
const { messages, sendMessage, status } = useChat({ transport })
```

`status` は `'ready' | 'submitted' | 'streaming' | 'error'` のいずれか。

---

## LLM Tool Calling 設計

`/api/chat/route.ts` は `streamText` を最大5ステップで実行します（`stopWhen: stepCountIs(5)`）。

### 定義済みツール (`src/lib/llm/tools.ts`)

| ツール名 | 説明 | 主なユースケース |
|---------|------|----------------|
| `listStatisticsCategories` | 利用可能な統計カテゴリ一覧を返す | LLMが適切なカテゴリを選択する起点 |
| `fetchStatistics` | カテゴリIDとエリアコードで統計データ取得 | 主要3カテゴリのデータ取得 |
| `searchStatsList` | e-Stat APIをキーワード検索 | カテゴリ外のデータを探す |
| `fetchStatsByStatsId` | 統計表IDを直接指定してデータ取得 | `searchStatsList` で見つけたIDで取得 |
| `addArea` | 地名をエリアとして地図上に追加 | チャットで言及した地名を地図に反映 |
| `getAreaInfo` | エリアの基本情報を返す（スタブ） | 将来拡張用 |

### フォールバック戦略

`fetchStatistics` は市区町村データ取得失敗時に都道府県レベルへ自動フォールバックします。

```
市区町村コード(5桁) でfetch
  ↓ 失敗
都道府県コード(2桁→正規化) でfetch
  ↓ 失敗
LLM に "searchStatsList で別IDを探してください" とエラーを返す
```

フォールバック発生時は `coverageMismatch: true` と `note` をレスポンスに含め、LLMがユーザーに説明します。

### エリアコード正規化 (`EStatClient.normalizeAreaCode`)

e-Stat API は5桁のエリアコードを要求します。

| 入力 | レベル | 出力 |
|------|--------|------|
| `"13"` | prefecture | `"13000"` |
| `"1"` | prefecture | `"01000"` |
| `"13113"` | municipality | `"13113"` |
| `"1310"` | municipality | `"01310"` |

---

## エージェントモード

`/api/chat` は `agentMode` パラメータで挙動が変わります。

| モード | 値 | システムプロンプトの特徴 |
|--------|-----|------------------------|
| 標準 | `"default"` | 汎用統計アナリスト |
| マーケティング | `"marketing"` | 商圏分析・出店戦略に特化、ビジネスインサイト優先 |
| スライド | `"slides"` | Marp形式のMarkdownを出力 |

---

## 統計カテゴリ (`src/lib/estat/categories.ts`)

現在定義されている3カテゴリ:

| ID | 名前 | 統計表ID | 対応レベル |
|----|------|---------|-----------|
| `population` | 人口統計 | `0003448299` | 都道府県・市区町村 |
| `commerce` | 商業統計 | `0003149505` | 市区町村 |
| `economy` | 経済センサス | `0003353941` | 都道府県・市区町村 |

`coverage` フィールド:
- `"municipality"` — 市区町村レベルのみ対応
- `"prefecture"` — 都道府県レベルのみ対応
- `"mixed"` — 両レベルを含む統計表

---

## DBスキーマ

```
User
├── id (cuid)
├── email (unique)
├── name
├── image
└── sessions → ChatSession[]

ChatSession
├── id (cuid)
├── userId → User
├── title (LLMが自動生成)
├── areaName, areaCode (初回メッセージ時のエリア情報)
└── messages → ChatMessage[]

ChatMessage
├── id (cuid)
├── sessionId → ChatSession
├── role (user | assistant)
├── content
└── areaCode, areaName (メッセージ時点のエリア情報)
```

認証プロバイダとして NextAuth (v4) を使用。Prisma Adapter は使わず、`/api/auth/[...nextauth]` でユーザーを手動でupsertしています（`src/app/api/auth/`）。

---

## LLMプロバイダ

`getLLMModel()` (`/api/chat/route.ts`) が環境変数 `LLM_PROVIDER` を読み取ります。

```typescript
// anthropic | google | openai（デフォルト）
const provider = process.env.LLM_PROVIDER ?? 'openai'
```

Vercel AI SDK の統一インターフェースのため、切替時のツール定義コード変更は不要です。
