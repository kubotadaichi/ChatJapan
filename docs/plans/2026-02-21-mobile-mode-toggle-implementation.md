# Mobile Mode Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** モバイルで右クリック不要でモード（県 / 市区町村）を切り替えられるセグメントコントロールを地図右上に追加する。

**Architecture:** `MobileModeToggle` コンポーネントを新規作成し、MapPanel の JSX 内に `md:hidden` でモバイル専用として埋め込む。既存の PC 右クリックコンテキストメニューはそのまま維持する。`selectedArea?.level === 'prefecture'` のときのみ市区町村ボタンを有効化することで、`enterMunicipalityMode` に必ず有効な prefecture を渡せる。

**Tech Stack:** Next.js 15 App Router, Tailwind CSS, Vitest + Testing Library

---

## Task 1: MobileModeToggle コンポーネント（TDD）

**Files:**
- Create: `src/components/map/MobileModeToggle.test.tsx`
- Create: `src/components/map/MobileModeToggle.tsx`

**Step 1: テストを書く**

`src/components/map/MobileModeToggle.test.tsx` を作成:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MobileModeToggle } from './MobileModeToggle'

const baseProps = {
  selectionMode: 'prefecture' as const,
  selectedArea: null,
  focusedPrefecture: null,
  onEnterMunicipalityMode: vi.fn(),
  onExitMunicipalityMode: vi.fn(),
}

describe('MobileModeToggle', () => {
  it('renders 県 and 市区町村 buttons', () => {
    render(<MobileModeToggle {...baseProps} />)
    expect(screen.getByRole('button', { name: '県' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '市区町村' })).toBeInTheDocument()
  })

  it('applies active style to 県 button when selectionMode is prefecture', () => {
    render(<MobileModeToggle {...baseProps} selectionMode="prefecture" />)
    expect(screen.getByRole('button', { name: '県' }).className).toContain('bg-primary')
  })

  it('applies active style to 市区町村 button when selectionMode is municipality', () => {
    render(
      <MobileModeToggle
        {...baseProps}
        selectionMode="municipality"
        focusedPrefecture={{ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' }}
      />
    )
    expect(screen.getByRole('button', { name: '市区町村' }).className).toContain('bg-primary')
  })

  it('disables 市区町村 button when selectionMode is prefecture and no area selected', () => {
    render(<MobileModeToggle {...baseProps} selectionMode="prefecture" selectedArea={null} />)
    expect(screen.getByRole('button', { name: '市区町村' })).toBeDisabled()
  })

  it('disables 市区町村 button when selected area is a municipality', () => {
    render(
      <MobileModeToggle
        {...baseProps}
        selectionMode="prefecture"
        selectedArea={{ name: '渋谷区', code: '13113', prefCode: '13', level: 'municipality' }}
      />
    )
    expect(screen.getByRole('button', { name: '市区町村' })).toBeDisabled()
  })

  it('enables 市区町村 button when selectionMode is prefecture and prefecture is selected', () => {
    render(
      <MobileModeToggle
        {...baseProps}
        selectionMode="prefecture"
        selectedArea={{ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' }}
      />
    )
    expect(screen.getByRole('button', { name: '市区町村' })).not.toBeDisabled()
  })

  it('calls onEnterMunicipalityMode with selectedArea when 市区町村 button clicked', async () => {
    const onEnter = vi.fn()
    const prefecture = { name: '東京都', code: '13', prefCode: '13', level: 'prefecture' as const }
    render(
      <MobileModeToggle
        {...baseProps}
        selectionMode="prefecture"
        selectedArea={prefecture}
        onEnterMunicipalityMode={onEnter}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: '市区町村' }))
    expect(onEnter).toHaveBeenCalledWith(prefecture)
  })

  it('calls onExitMunicipalityMode when 県 button clicked in municipality mode', async () => {
    const onExit = vi.fn()
    render(
      <MobileModeToggle
        {...baseProps}
        selectionMode="municipality"
        focusedPrefecture={{ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' }}
        onExitMunicipalityMode={onExit}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: '県' }))
    expect(onExit).toHaveBeenCalled()
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/components/map/MobileModeToggle.test.tsx
```

Expected: FAIL（MobileModeToggle not found）

**Step 3: MobileModeToggle を実装**

`src/components/map/MobileModeToggle.tsx` を作成:

```typescript
import type { SelectedArea } from '@/lib/types'
import type { SelectionMode } from '@/hooks/useMapSelection'

interface MobileModeToggleProps {
  selectionMode: SelectionMode
  selectedArea: SelectedArea | null
  focusedPrefecture: SelectedArea | null
  onEnterMunicipalityMode: (prefecture: SelectedArea) => void
  onExitMunicipalityMode: () => void
}

export function MobileModeToggle({
  selectionMode,
  selectedArea,
  onEnterMunicipalityMode,
  onExitMunicipalityMode,
}: MobileModeToggleProps) {
  const canEnterMunicipality =
    selectionMode === 'prefecture' && selectedArea?.level === 'prefecture'
  const municipalityEnabled = canEnterMunicipality || selectionMode === 'municipality'

  return (
    <div className="flex rounded-lg overflow-hidden border border-border shadow-sm">
      <button
        type="button"
        aria-label="県"
        onClick={onExitMunicipalityMode}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          selectionMode === 'prefecture'
            ? 'bg-primary text-primary-foreground'
            : 'bg-card/90 text-muted-foreground hover:bg-accent'
        }`}
      >
        県
      </button>
      <button
        type="button"
        aria-label="市区町村"
        disabled={!municipalityEnabled}
        onClick={() => {
          if (selectionMode === 'prefecture' && selectedArea?.level === 'prefecture') {
            onEnterMunicipalityMode(selectedArea)
          }
        }}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          selectionMode === 'municipality'
            ? 'bg-primary text-primary-foreground'
            : municipalityEnabled
              ? 'bg-card/90 text-muted-foreground hover:bg-accent'
              : 'bg-card/90 text-muted-foreground opacity-50 cursor-not-allowed'
        }`}
      >
        市区町村
      </button>
    </div>
  )
}
```

**Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/components/map/MobileModeToggle.test.tsx
```

Expected: PASS（7 tests）

**Step 5: コミット**

```bash
git add src/components/map/MobileModeToggle.tsx src/components/map/MobileModeToggle.test.tsx
git commit -m "feat: add MobileModeToggle segmented control for mobile mode switching"
```

---

## Task 2: MapPanel に MobileModeToggle を追加（TDD）

**Files:**
- Modify: `src/components/map/MapPanel.tsx`
- Modify: `src/components/map/MapPanel.test.tsx`

**Step 1: MapPanel.test.tsx にテストを追加**

`src/components/map/MapPanel.test.tsx` の `describe('MapPanel', ...)` ブロック内末尾に追加:

```typescript
  it('renders MobileModeToggle buttons', () => {
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={vi.fn()}
        selectionMode="prefecture"
        focusedPrefecture={null}
        onEnterMunicipalityMode={vi.fn()}
        onExitMunicipalityMode={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '県' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '市区町村' })).toBeInTheDocument()
  })
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/components/map/MapPanel.test.tsx
```

Expected: FAIL（「県」「市区町村」ボタンが見つからない）

**Step 3: MapPanel に MobileModeToggle を追加**

`src/components/map/MapPanel.tsx` を以下の通り変更:

1. import を追加（ファイル先頭の import 群の末尾に）:

```typescript
import { MobileModeToggle } from './MobileModeToggle'
```

2. `return (` の直後、`{/* 市区町村モード中: 対象都道府県名を表示 */}` の前に追加:

```typescript
      {/* モバイル専用モード切り替えボタン */}
      <div className="absolute top-3 right-3 z-10 md:hidden">
        <MobileModeToggle
          selectionMode={selectionMode}
          selectedArea={selectedArea}
          focusedPrefecture={focusedPrefecture}
          onEnterMunicipalityMode={onEnterMunicipalityMode}
          onExitMunicipalityMode={onExitMunicipalityMode}
        />
      </div>
```

**Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/components/map/MapPanel.test.tsx
```

Expected: PASS（7 tests）

**Step 5: 全テストが通ることを確認**

```bash
npm run test:run
```

Expected: 全テスト PASS

**Step 6: コミット**

```bash
git add src/components/map/MapPanel.tsx src/components/map/MapPanel.test.tsx
git commit -m "feat: embed MobileModeToggle in MapPanel for mobile mode switching"
```

---

## 完了チェックリスト

- [ ] `npm run test:run` 全テスト PASS
- [ ] スマホサイズで地図右上に「県」「市区町村」ボタンが表示される
- [ ] PC サイズではボタンが表示されない
- [ ] 都道府県をタップ後、「市区町村」ボタンが有効化される
- [ ] 「市区町村」ボタンをタップすると市区町村モードに切り替わる
- [ ] 「県」ボタンをタップすると県選択モードに戻る
