# Statistics Category Expansion Design

## Goal
統計カテゴリを将来的に上限なく拡張できる構造へ移行しつつ、チャット入力上部にカテゴリ対応状況（市区町村/都道府県/混在）を常時表示する。

## Scope
- カテゴリ拡張のためのデータモデル拡張
- LLMツール側の対応レベル補正（静的定義 + 実行時補正）
- チャット入力上部へのカテゴリ一覧表示（表示のみ、操作なし）
- テスト追加（型・ツール・API・UI）

## Non-Goals
- カテゴリ手動選択UI
- 管理画面
- 自動学習によるカテゴリ判定

## Architecture
### 1. Static Source of Truth
`src/lib/estat/categories.ts` をカテゴリ情報の唯一の基準とする。

各カテゴリは以下を持つ:
- `id`, `name`, `description`, `statsIds`
- `coverage`: `municipality | prefecture | mixed`
- `coverageNote?`

### 2. Runtime Reconciliation
`fetchStatistics` 実行時に「想定 coverage」と「実際の取得結果」を照合する。

- 想定と実測が一致: 通常レスポンス
- 不一致: `coverageMismatch` と `note` を返却し、LLM回答で明示させる

### 3. UI Representation
チャット入力上部にカテゴリチップ帯を常時表示する。

- 市区町村対応: `市区町村`
- 都道府県対応: `都道府県`
- 混在: `混在`（必要に応じて補足テキスト）

クリック操作は実装しない（表示のみ）。

## Data Flow
1. Chat UI がカテゴリ一覧APIを取得
2. `ChatInput` がカテゴリチップを描画
3. ユーザー質問時、既存どおり `fetchStatistics` を呼び出し
4. ツール内部で coverage 不一致を補正して返却
5. LLM が note を含めて説明

## Error Handling
- カテゴリ一覧API失敗: チップ帯のみ非表示、入力は継続可能
- 市区町村非対応カテゴリで市区町村指定: 都道府県フォールバック + 明示 note
- 取得不能: 現行エラーフォーマットを維持し、説明文を強化

## Testing Strategy
- `src/lib/estat/categories.test.ts`
  - coverage必須
  - id重複なし
- `src/lib/llm/tools.test.ts`
  - coverage mismatch
  - フォールバック note
- `src/app/api/statistics/categories/route.test.ts`
  - 一覧取得200
- `src/components/chat/ChatPanel.test.tsx` / `src/components/chat/ChatInput.test.tsx`
  - チップ表示
  - API失敗時フォールバック表示
- 全体回帰: `npm run test:run`

## Future Extension Policy
新カテゴリ追加は以下のみで完了することを設計原則とする:
1. `categories.ts` に1エントリ追加
2. 必要なら `coverageNote` を追記
3. テスト更新

ツール実装本体の追加改修は原則不要（YAGNI）。
