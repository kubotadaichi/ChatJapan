# ChatJapan 設計ドキュメント

**作成日:** 2026-02-21
**ステータス:** 承認済み

---

## 概要

日本の地図上でエリアを指定しながら、統計情報を参照して回答するチャットサービス。
マーケティング担当者による商圏分析をメインユースケースとしつつ、一般市民・研究者にも対応する。

---

## ターゲットユーザー

| ユーザー | 主な用途 |
|---------|---------|
| マーケティング担当者（メイン）| 商圏分析・エリアマーケティング・出店判断 |
| 一般市民 | 自分の街の人口・施設情報などを気軽に調べる |
| 研究者・ジャーナリスト | 地域統計の深掘り分析 |

---

## UI/UX 設計

### フェーズ1（初期）: スプリットスクリーン

```
┌─────────────────────────────────────────────────────────────┐
│  ChatJapan                              [ログイン] [履歴]    │
├──────────────────────────┬──────────────────────────────────┤
│                          │  🗾 渋谷区を選択中               │
│      Japan Map           │  ─────────────────────────────  │
│                          │  You: 渋谷区の年齢構成を教えて   │
│  ┌──────┐               │                                  │
│  │ 東京 │ ← クリックで  │  AI: 渋谷区(2020年国勢調査)      │
│  │ [選択]│   市区町村へ  │  総人口: 229,069人               │
│  └──────┘   ズームイン  │  0-14歳: 9.2% ...               │
│                          │  ─────────────────────────────  │
│  凡例: [選択解除]        │  [テキスト入力      ] [📍] [送信]│
└──────────────────────────┴──────────────────────────────────┘
```

**インタラクションフロー:**
1. 地図でエリアをクリック → ハイライト + ヘッダーに選択エリア名表示
2. チャット入力 → 選択エリアのコンテキストが自動でLLMに渡る
3. `📍` ボタンで地図パネルにフォーカス（キーボードユーザー向け）
4. まずは単一エリア選択から実装、複数エリア選択は将来対応

### フェーズ2（長期）: アダプティブレイアウト

- デスクトップ: スプリットスクリーン（フェーズ1と同様）
- モバイル: チャット画面がデフォルト、地図はボトムシートで表示

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 15 (App Router) |
| スタイリング | Tailwind CSS + shadcn/ui |
| 地図 | MapLibre GL JS |
| 地図データ | e-Stat GeoJSON 境界データ |
| LLM統合 | Vercel AI SDK（マルチLLM対応） |
| 認証 | NextAuth.js |
| キャッシュ | Redis / Vercel KV |
| DB | PostgreSQL / Vercel Postgres |

---

## アーキテクチャ

```
┌──────────────── Frontend (Next.js App Router) ────────────────┐
│  MapPanel (MapLibre GL JS)  │  ChatPanel                      │
│  - 都道府県/市区町村クリック  │  - メッセージ一覧                │
│  - 選択エリアをハイライト    │  - LLMストリーミング回答          │
│  - GeoJSON境界データ表示    │  - ログイン時: 履歴保存           │
└───────────────────────────────────────────────────────────────┘
                        │ API Routes
┌──────────────── Backend (Next.js API Routes) ─────────────────┐
│  LLM Adapter Layer          │  Statistics Data Layer           │
│  - Vercel AI SDK            │  - e-Stat API wrapper            │
│  - 環境変数でプロバイダ切替  │  - キャッシュ (Vercel KV)        │
└───────────────────────────────────────────────────────────────┘
                        │
┌──────────────── Data ─────────────────────────────────────────┐
│  Auth: NextAuth.js (任意ログイン)                              │
│  DB: Vercel Postgres (会話履歴)                               │
│  GeoJSON: e-Stat 境界データ (都道府県・市区町村)               │
└───────────────────────────────────────────────────────────────┘
```

---

## エリアコード設計

```typescript
type SelectedArea = {
  name: string       // "渋谷区"
  code: string       // "13113" (e-Stat 市区町村コード 5桁)
  prefCode: string   // "13" (都道府県コード 2桁)
  level: "prefecture" | "municipality"
}
```

地図クリック時に GeoJSON の feature.properties から上記を抽出し、
LLMへのコンテキストおよびTool Callingのパラメータとして使用する。

---

## LLM Tool Calling 設計

### Tool一覧

| Tool | 説明 |
|------|------|
| `listStatisticsCategories()` | 利用可能な統計カテゴリ一覧を返す |
| `fetchStatistics(areaCode, prefCode, statsId, params?)` | e-Stat APIからデータ取得 |
| `getAreaInfo(areaCode)` | エリアの基本情報（面積・隣接エリア等）を返す |

### 拡張戦略

- **初期スコープ:** 国勢調査・商業統計・経済センサスの3カテゴリ
- **中期:** カテゴリを拡張、LLMが `listStatisticsCategories()` を呼び出して
  ユーザーの質問に応じて適切なカテゴリを自動選択する設計
- カテゴリの追加は Tool の実装を追加するだけでLLMが自動的に活用可能

### LLM自動選択フロー（中期）

```
User: "渋谷区で出店に向いてるか教えて"
    ↓
LLM → listStatisticsCategories() 呼び出し
    ↓ カテゴリ一覧取得
LLM → 「商業統計」「人口統計」「経済センサス」を選択
    ↓
LLM → fetchStatistics() × 3回並列呼び出し
    ↓ データ集約
LLM → 総合的な出店分析を回答
```

### LLMプロバイダ切替

`LLM_PROVIDER=openai|anthropic|...` の環境変数で切替。
Vercel AI SDK の統一インターフェースを使用するため、切替時のコード変更不要。

---

## 認証設計

- **未ログイン:** フル機能で利用可能（会話履歴は保存されない）
- **ログイン時:** 会話履歴の保存・参照が可能
- NextAuth.js を使用。初期はGoogleログインのみ対応。

---

## キャッシュ戦略

- e-Stat API のレスポンスは Vercel KV (Redis) にキャッシュ
- TTL: 24時間（統計データは頻繁に変わらないため）
- キャッシュキー: `stats:{statsId}:{areaCode}`

---

## デプロイ設計

### 短期: Vercel（確定）

```
GitHub → Vercel (自動デプロイ)
  - Next.js フロントエンド + API Routes
  - Vercel KV (Redis キャッシュ)
  - Vercel Postgres (会話履歴)
  - 環境変数でLLM/APIキー管理
```

### 長期: AWS + Terraform（要検討）

Lambda・Bedrock・ECS Fargate などのコスト比較を行い決定する。
Terraform によるIaC管理を前提とし、以下モジュール構成を想定:

```
terraform/
├── modules/
│   ├── networking/   (VPC, Subnets, SG)
│   ├── compute/      (ECS or Lambda)
│   ├── database/     (RDS, ElastiCache)
│   └── cdn/          (CloudFront, S3)
├── environments/
│   ├── staging/
│   └── production/
└── main.tf
```

**移行方針:** インフラ依存のコードを書かず、環境変数とDB接続先の変更のみで
Vercel → AWS への移行が完了できる設計を維持する。

---

## 段階的実装ロードマップ

| フェーズ | 内容 |
|---------|------|
| Phase 1 | Next.js セットアップ + MapLibre地図表示 + エリア選択 |
| Phase 2 | e-Stat API連携 + LLM Tool Calling（初期3カテゴリ） |
| Phase 3 | チャットUI + ストリーミング回答 + Vercelデプロイ |
| Phase 4 | NextAuth.js 認証 + 会話履歴保存 |
| Phase 5 | 統計カテゴリ拡張 + LLM自動選択 |
| Phase 6 | モバイル対応（アダプティブレイアウト） |
| Phase 7 | AWS移行（Terraform IaC） |
