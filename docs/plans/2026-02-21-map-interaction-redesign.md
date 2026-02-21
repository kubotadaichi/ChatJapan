# マップインタラクション再設計 実装指示書

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

## 作業ブランチ・ワークツリー

- **Branch:** `feature/municipality-drilldown`
- **Worktree:** `/Users/kubotadaichi/dev/github/ChatJapan/.worktrees/municipality-drilldown`
- **Dev server:** `npm run dev` をワークツリーディレクトリで実行

---

## 現在の実装状況

テスト: **45件 PASS**（9ファイル）
最新コミット: `f479185 refactor: redesign map interaction`

### 現在の動作（変更前）

| 操作 | 動作 |
|------|------|
| 県 左クリック | 県をハイライト・選択 |
| 県 右クリック | 市区町村境界を表示（drilldown）、browser contextmenu 抑制 |
| 市区町村 右クリック | 市区町村を選択 |
| 「都道府県に戻る」ボタン | 県モードに戻る |

---

## 目標とするUX

### 基本コンセプト

**右クリック** → 常に「選択モード切り替えメニュー」を表示
**左クリック** → 現在の選択モードに応じてエリアを選択
**同じエリアを再度左クリック** → 選択解除（トグル）

### 選択モード一覧

| モード | 状態 | 動作 |
|--------|------|------|
| **県選択モード** | 実装する（デフォルト） | 左クリックで県を選択・ハイライト |
| **市区町村モード** | 実装する | 左クリックで市区町村を選択・ハイライト |
| 円周モード | メニューに表示のみ（disabled） | 将来実装 |
| 矩形モード | メニューに表示のみ（disabled） | 将来実装 |
| 複数選択 | メニューに表示のみ（disabled） | 将来実装 |

### 詳細フロー

#### 県選択モード（デフォルト）
1. マップ表示: 都道府県の境界線のみ
2. 左クリックで県をハイライト → チャットパネルに県名反映
3. 同じ県を再度左クリック → 選択解除
4. 右クリック → モード切り替えメニューを表示:
   ```
   ┌──────────────────────┐
   │ ✓ 県選択モード        │  ← 現在のモード（チェックマーク）
   │   市区町村モード      │  ← クリックで切り替え
   │ ─────────────────── │
   │   円周モード    (準備中) │  ← グレーアウト
   │   矩形モード    (準備中) │
   │   複数選択      (準備中) │
   └──────────────────────┘
   ```
5. 「市区町村モード」をクリック → **右クリックした都道府県** の市区町村を表示してモード切り替え

#### 市区町村モード
1. マップ表示: 右クリックした都道府県の市区町村境界線を表示（drilldown）
2. 左クリックで市区町村をハイライト → チャットパネルに市区町村名反映
3. 同じ市区町村を再度左クリック → 選択解除
4. 右クリック → モード切り替えメニューを表示:
   ```
   ┌──────────────────────┐
   │   県選択モード        │  ← クリックで戻る
   │ ✓ 市区町村モード      │  ← 現在のモード（チェックマーク）
   │ ─────────────────── │
   │   円周モード    (準備中) │
   │   矩形モード    (準備中) │
   │   複数選択      (準備中) │
   └──────────────────────┘
   ```
5. 「県選択モード」をクリック → 県モードに戻る（「都道府県に戻る」ボタンは廃止してもよい）

---

## 実装計画

### Task 1: `useMapSelection` フック更新

**Files:**
- `src/hooks/useMapSelection.ts`
- `src/hooks/useMapSelection.test.ts`

#### 変更内容

```typescript
// src/hooks/useMapSelection.ts
import { useState } from 'react'
import type { SelectedArea } from '@/lib/types'

export type SelectionMode = 'prefecture' | 'municipality'
// 将来のモード（UIには表示するが未実装）
export type SelectionModeAll = SelectionMode | 'circle' | 'rectangle' | 'multiple'

export function useMapSelection() {
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('prefecture')
  const [focusedPrefecture, setFocusedPrefecture] = useState<SelectedArea | null>(null)

  const selectArea = (area: SelectedArea) => {
    // 同じエリアを再選択 → 解除（トグル）
    if (selectedArea?.code === area.code && selectedArea?.level === area.level) {
      setSelectedArea(null)
    } else {
      setSelectedArea(area)
    }
  }

  const clearSelection = () => {
    setSelectedArea(null)
  }

  // 市区町村モードに切り替え（対象都道府県を記録）
  const enterMunicipalityMode = (prefecture: SelectedArea) => {
    setFocusedPrefecture(prefecture)
    setSelectionMode('municipality')
    setSelectedArea(null)
  }

  // 県モードに戻る
  const exitMunicipalityMode = () => {
    setFocusedPrefecture(null)
    setSelectionMode('prefecture')
    setSelectedArea(null)
  }

  return {
    selectedArea,
    selectionMode,
    focusedPrefecture,
    selectArea,
    clearSelection,
    enterMunicipalityMode,
    exitMunicipalityMode,
  }
}
```

#### テスト追加（TDDで先にテストを書く）

```typescript
describe('selection mode', () => {
  it('starts in prefecture mode', () => {
    const { result } = renderHook(() => useMapSelection())
    expect(result.current.selectionMode).toBe('prefecture')
    expect(result.current.focusedPrefecture).toBeNull()
  })

  it('enterMunicipalityMode switches mode and records prefecture', () => {
    const { result } = renderHook(() => useMapSelection())
    act(() => {
      result.current.enterMunicipalityMode({ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' })
    })
    expect(result.current.selectionMode).toBe('municipality')
    expect(result.current.focusedPrefecture?.name).toBe('東京都')
  })

  it('enterMunicipalityMode clears selectedArea', () => {
    const { result } = renderHook(() => useMapSelection())
    act(() => {
      result.current.selectArea({ name: '渋谷区', code: '13113', prefCode: '13', level: 'municipality' })
      result.current.enterMunicipalityMode({ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' })
    })
    expect(result.current.selectedArea).toBeNull()
  })

  it('exitMunicipalityMode returns to prefecture mode', () => {
    const { result } = renderHook(() => useMapSelection())
    act(() => {
      result.current.enterMunicipalityMode({ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' })
      result.current.exitMunicipalityMode()
    })
    expect(result.current.selectionMode).toBe('prefecture')
    expect(result.current.focusedPrefecture).toBeNull()
  })
})

describe('toggle deselect', () => {
  it('clicking same area twice deselects it', () => {
    const { result } = renderHook(() => useMapSelection())
    const area = { name: '東京都', code: '13', prefCode: '13', level: 'prefecture' as const }
    act(() => { result.current.selectArea(area) })
    expect(result.current.selectedArea?.code).toBe('13')
    act(() => { result.current.selectArea(area) })
    expect(result.current.selectedArea).toBeNull()
  })

  it('clicking different area changes selection', () => {
    const { result } = renderHook(() => useMapSelection())
    act(() => {
      result.current.selectArea({ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' })
    })
    act(() => {
      result.current.selectArea({ name: '大阪府', code: '27', prefCode: '27', level: 'prefecture' })
    })
    expect(result.current.selectedArea?.code).toBe('27')
  })
})
```

---

### Task 2: `MapPanel` 更新

**Files:**
- `src/components/map/MapPanel.tsx`
- `src/components/map/MapPanel.test.tsx`

#### Props 変更

```typescript
// 旧: viewLevel, focusedPrefecture, onDrillDown, onDrillUp
// 新:
interface MapPanelProps {
  selectedArea: SelectedArea | null
  onAreaSelect: (area: SelectedArea) => void
  onAreaClear?: () => void
  selectionMode: SelectionMode
  focusedPrefecture: SelectedArea | null
  onEnterMunicipalityMode: (prefecture: SelectedArea) => void
  onExitMunicipalityMode: () => void
}
```

#### コンテキストメニュー実装

```typescript
interface ContextMenu {
  x: number
  y: number
  prefecture: SelectedArea | null  // 右クリックした都道府県（nullなら背景右クリック）
}
```

右クリックで表示するメニュー:
- 現在のモードにチェックマーク
- `onClick` でモード切り替え
- 将来モードは `disabled` + `opacity-50`
- メニュー外クリックで閉じる

#### MapLibreイベント設計

**県選択モード (`selectionMode === 'prefecture'`) の時:**
- `prefectures-fill` **左クリック** → `onAreaSelectRef.current(area)`（同一なら解除）
- `prefectures-fill` **右クリック** → コンテキストメニュー表示（右クリックした県を記録）

**市区町村モード (`selectionMode === 'municipality'`) の時:**
- `municipalities-fill` **左クリック** → `onAreaSelectRef.current(area)`（同一なら解除）
- `prefectures-fill`/`municipalities-fill` **右クリック** → コンテキストメニュー表示

**重要:** `selectionModeRef` を使ってイベントハンドラー内で現在モードを参照する（React staleクロージャ対策）

#### ハイライト

- `prefectures` ソース: `promoteId: 'id'`（dataofjapan/land の数値id）
  - `setFeatureState({ source: 'prefectures', id: Number(selectedArea.code) }, { selected: true })`
- `municipalities` ソース: `promoteId: 'N03_007'`（niiyz の文字列コード）
  - `setFeatureState({ source: 'municipalities', id: selectedArea.code }, { selected: true })`

---

### Task 3: `page.tsx` 更新

```typescript
// src/app/page.tsx
const {
  selectedArea,
  selectionMode,
  focusedPrefecture,
  selectArea,
  clearSelection,
  enterMunicipalityMode,
  exitMunicipalityMode,
} = useMapSelection()

// MapPanel へ
<MapPanel
  selectedArea={selectedArea}
  onAreaSelect={selectArea}
  onAreaClear={clearSelection}
  selectionMode={selectionMode}
  focusedPrefecture={focusedPrefecture}
  onEnterMunicipalityMode={enterMunicipalityMode}
  onExitMunicipalityMode={exitMunicipalityMode}
/>
```

---

### Task 4: テスト・ビルド確認

```bash
npm run test:run   # 全件PASS確認
npm run build      # ビルド確認
```

---

## 注意事項

### MapLibreのイベント干渉について

**重要:** MapLibreはクリック地点に重なる全レイヤーに対してイベントをfireする。市区町村モード中に `prefectures-fill` と `municipalities-fill` が重なる場合、両方のclickイベントが発火する。

対策: `selectionModeRef`（useRef）で現在モードをハンドラー内で参照し、不要なイベントを `return` でスキップ。

### 選択解除（トグル）の実装

`selectArea` 関数内で比較:
```typescript
if (selectedArea?.code === area.code && selectedArea?.level === area.level) {
  setSelectedArea(null)  // 解除
} else {
  setSelectedArea(area)  // 選択
}
```

### 「都道府県に戻る」ボタンの扱い

右クリックメニューから「県選択モード」を選べば戻れるため、UIボタンは**残してもよいが省略も可**。
コンテキストメニューの方が一貫性があるため、ボタンは削除推奨。

### コンテキストメニューのポジション

MapLibreの `e.point` はマップコンテナ内のピクセル座標。これを `style={{ left: x, top: y }}` に使う。
画面端でメニューが切れないようにするには `Math.min(x, containerWidth - menuWidth)` で補正を検討。

---

## 完了チェックリスト

- [ ] `useMapSelection` のリファクタリング（viewLevel → selectionMode、drillDown/drillUp → enterMunicipalityMode/exitMunicipalityMode）
- [ ] `useMapSelection.test.ts` が全件PASS
- [ ] `MapPanel` の右クリックメニュー実装（現在モードにチェック、将来モードはdisabled）
- [ ] 左クリックでエリア選択（県モード: 県、市区町村モード: 市区町村）
- [ ] 同じエリアを再左クリックで選択解除
- [ ] 県ハイライト（promoteId: 'id' + setFeatureState）
- [ ] 市区町村ハイライト（promoteId: 'N03_007' + setFeatureState）
- [ ] `page.tsx` の配線更新
- [ ] `MapPanel.test.tsx` のprops更新
- [ ] `npm run test:run` 全件PASS（45件以上）
- [ ] `npm run build` 成功
