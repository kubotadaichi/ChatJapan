# 市区町村ドリルダウン 設計ドキュメント

## 概要

都道府県クリック後に市区町村レベルの地図・統計情報を表示するドリルダウン機能。
e-Stat GIS APIから市区町村GeoJSONを動的取得し、Vercel KVでキャッシュする。

---

## アーキテクチャ

### UXフロー

1. 都道府県レイヤー表示（現状）
2. ユーザーが都道府県をクリック → **ズームイン** + 市区町村GeoJSON取得開始
3. 市区町村レイヤーを地図に追加表示
4. ユーザーが市区町村をクリック → `selectedArea` が municipality レベルに更新
5. 「都道府県に戻る」ボタンでズームアウト + 市区町村レイヤー削除

### データフロー

```
MapPanel
  ↓ 都道府県クリック
/api/geojson/[prefCode] (Next.js route)
  ↓ Vercel KV にキャッシュあり？
  ├─ Yes → KVから返す
  └─ No  → e-Stat GIS API → KVに保存 → 返す
  ↓
MapPanel に市区町村GeoJSON追加
  ↓ 市区町村クリック
onAreaSelect({ level: 'municipality', ... })
  ↓
ChatPanel に渡す（既存）
```

### 状態管理

`useMapSelection` フックを拡張：

| 状態 | 型 | 説明 |
|---|---|---|
| `selectedArea` | `SelectedArea \| null` | chatに渡すエリア（変更なし） |
| `viewLevel` | `'prefecture' \| 'municipality'` | 現在の地図表示レベル |
| `focusedPrefecture` | `SelectedArea \| null` | ドリルダウン中の都道府県 |

新メソッド：
- `drillDown(prefecture: SelectedArea)` — 都道府県を選択してズームイン
- `drillUp()` — 都道府県レベルに戻る

---

## ファイル構成

### 新規ファイル

| ファイル | 役割 |
|---|---|
| `src/app/api/geojson/[prefCode]/route.ts` | e-Stat GIS APIプロキシ＋KVキャッシュ |
| `src/lib/geojson/estat-gis.ts` | e-Stat GIS APIクライアント |
| `src/lib/geojson/estat-gis.test.ts` | URLビルド等のユニットテスト |

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `src/hooks/useMapSelection.ts` | `viewLevel`・`focusedPrefecture`・`drillDown`・`drillUp` 追加 |
| `src/hooks/useMapSelection.test.ts` | ドリルダウンシナリオのテスト追加 |
| `src/components/map/MapPanel.tsx` | 市区町村レイヤー追加・削除・ズームロジック |
| `src/components/map/MapPanel.test.tsx` | ドリルダウンUIのテスト追加 |

---

## e-Stat GIS API

```
GET https://www.e-stat.go.jp/api/v3/statmap/boundary
  ?appId={ESTAT_API_KEY}
  &regionCode={prefCode}   // 例: 13
  &year=2020
  &geometryType=1          // 1=市区町村
  &format=geojson
```

- 環境変数: `ESTAT_API_KEY`（既存）
- KVキャッシュキー: `geojson:municipality:{prefCode}`
- キャッシュTTL: 30日（境界データは変更頻度が低い）

---

## エラーハンドリング

- e-Stat GIS API エラー → マップパネルに「市区町村データを取得できませんでした」表示
- Vercel KV 未設定時 → KVスキップしてAPIを直接呼ぶ（開発環境対応）
- WebGL未対応 → 既存の try/catch で吸収済み

---

## テスト方針（TDD）

- `estat-gis.test.ts`: URLビルド・キャッシュキー生成のユニットテスト
- `useMapSelection.test.ts`: `drillDown()` / `drillUp()` の状態遷移テスト
- `MapPanel.test.tsx`: ドリルダウン後に「都道府県に戻る」ボタンが表示されるかのUIテスト
- `/api/geojson/[prefCode]` ルートはE2Eテスト対象外（外部APIのため）
