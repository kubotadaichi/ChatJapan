# e-Stat 市区町村データ取得修正 実装指示書

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

## 作業ブランチ・ワークツリー

- **Branch:** `feature/municipality-drilldown`
- **Worktree:** `/Users/kubotadaichi/dev/github/ChatJapan/.worktrees/municipality-drilldown`
- **Dev server:** `npm run dev` をワークツリーディレクトリで実行

---

## 現在の実装状況

テスト: **48件 PASS**（9ファイル）
最新コミット: `91def6d fix: fetch all municipality files from niiyz per-file path and remove auto-zoom`

### 直前セッションで完了した変更

| 変更 | 説明 |
|------|------|
| `useMapSelection` リファクタリング | `viewLevel/drillDown/drillUp` → `selectionMode/enterMunicipalityMode/exitMunicipalityMode` |
| コンテキストメニュー | 右クリックでモード切り替えメニュー（将来モードはdisabled） |
| 市区町村選択修正 | niiyz の個別ファイルを並列フェッチして全市区町村を表示 |
| ズーム停止 | モード切り替え時の `flyTo({ zoom: 9 })` を削除 |

---

## 残タスク: e-Stat 市区町村データ取得の修正

### 根本原因

`src/lib/estat/categories.ts` の `statsIds` が**都道府県レベルのみ**対応の統計表IDを使用している。
市区町村コード（例: `13113` 渋谷区）でクエリすると STATUS:1（該当データなし）または STATUS:300（IDが存在しない）を返す。

### 調査結果（検証済み）

| カテゴリ | 旧ID | 旧IDの問題 | 新ID | 新IDの確認 |
|---------|------|-----------|------|-----------|
| `population` | `0003410379` | STATUS:1（市区町村データなし） | `0003448299` | ✅ 渋谷区 TOTAL:21 |
| `commerce` | `0003146045` | STATUS:300（IDが存在しない） | `0003149505` | ✅ 渋谷区 TOTAL:225 |
| `economy` | `0003215767` | STATUS:300（IDが存在しない） | `0003353941` | ✅ 渋谷区 TOTAL:90 |

新IDはすべて**都道府県レベルでも動作**（`cdArea=13000` で STATUS:0）するので、既存のフォールバック処理もそのまま機能する。

### 各新IDの詳細

```
0003448299: 時系列データ 男女，年齢，配偶関係
  - タイトル: 年齢（3区分），男女別人口及び年齢別割合 - 都道府県，市区町村（令和2年）北海道〜沖縄県
  - 統計: 国勢調査 statsCode=00200521, surveyYear=2020

0003149505: 商業統計
  - タイトル: 産業分類小分類別の事業所数，従業者数，年間商品販売額，売場面積（小売業） 第3巻 産業編（市区町村表）
  - 統計: 商業統計調査

0003353941: 経済センサス
  - タイトル: 産業（大分類），経営組織（2区分）別事業所・民営事業所数及び従業者数 - 全国，都道府県，市区町村
  - 統計: 経済センサス-活動調査
```

---

## Task 1: `categories.ts` の statsIds 更新

**File:** `src/lib/estat/categories.ts`

```typescript
export const STATISTICS_CATEGORIES: StatisticsCategory[] = [
  {
    id: 'population',
    name: '人口統計',
    description: '国勢調査による人口・年齢構成・世帯数などの情報（2020年調査）',
    // 年齢（3区分），男女別人口及び年齢別割合 - 都道府県，市区町村（令和2年）
    statsIds: ['0003448299'],
  },
  {
    id: 'commerce',
    name: '商業統計',
    description: '小売業・卸売業の店舗数・売上高・従業者数などの商業情報',
    // 産業編（市区町村表）- 事業所数，従業者数，年間商品販売額，売場面積
    statsIds: ['0003149505'],
  },
  {
    id: 'economy',
    name: '経済センサス',
    description: '事業所数・従業員数・産業構造など経済活動の基本情報',
    // 産業（大分類），経営組織別 事業所・民営事業所数及び従業者数 - 全国，都道府県，市区町村
    statsIds: ['0003353941'],
  },
]
```

---

## Task 2: `fetchStatistics` のエラーハンドリング改善

**File:** `src/lib/llm/tools.ts`

`STATISTICAL_DATA` が `null` の場合（STATUS 0 でもデータが空の場合）に `!` アサーションでクラッシュしないよう確認。
現在の `decodeValues` は `if (!statData) return { statsId, error: 'データなし', values: [] }` で対応済みだが、`fetchStatsData` 呼び出し側の `!` を確認:

```typescript
// 現在のコード（要確認）
return decodeValues(response.GET_STATS_DATA.STATISTICAL_DATA!, statsId)

// 修正案（STATISTICAL_DATA が undefined の場合に対応）
return decodeValues(response.GET_STATS_DATA.STATISTICAL_DATA ?? null, statsId)
```

---

## Task 3: テスト・動作確認

```bash
npm run test:run   # 全件PASS確認
npm run build      # ビルド確認
```

動作確認手順（devサーバーで）:
1. 県選択モードで東京都を左クリック → チャットで人口を聞く（都道府県レベル）
2. 右クリック → 市区町村モードに切り替え
3. 渋谷区を左クリック → チャットで人口を聞く（市区町村レベル）
4. 正確なデータが返ってくることを確認

---

## 完了チェックリスト

- [ ] `categories.ts` の statsIds を新IDに更新
- [ ] `fetchStatsData` の `!` アサーションを `?? null` に変更
- [ ] `npm run test:run` 全件PASS
- [ ] `npm run build` 成功
- [ ] devサーバーで市区町村レベルの統計データ取得を手動確認
