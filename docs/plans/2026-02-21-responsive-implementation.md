# Responsive Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** モバイル（768px未満）でボトムナビ付きタブ切り替えUIを追加し、PC（768px以上）は既存のスプリットスクリーンを維持する。

**Architecture:** `SplitLayout` を `hidden md:flex` にして PC 専用にし、新規 `MobileLayout` + `MobileTabBar` をモバイル専用として `page.tsx` で並列配置する。MapPanel は `visibility:hidden`（`invisible` クラス）で DOM に残し WebGL コンテキストを維持する。

**Tech Stack:** Next.js 15 App Router, Tailwind CSS, lucide-react, Vitest + Testing Library

---

## Task 1: viewport-fit=cover を layout.tsx に追加

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: layout.tsx を読む**

`src/app/layout.tsx` を確認する。現在 `<meta name="viewport">` が明示的に設定されていないことを確認。Next.js のデフォルト viewport 設定を上書きするため `metadata` に追加する。

**Step 2: viewport metadata を追加**

`src/app/layout.tsx` の `metadata` オブジェクトを以下に変更:

```typescript
export const metadata: Metadata = {
  title: 'ChatJapan',
  description: '日本の統計情報を地図で探索するチャットサービス',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}
```

> **注意:** Next.js 15 では `viewport` は `metadata` とは別の named export として定義する。`Viewport` 型は `next` からインポートできる。

**Step 3: ビルドエラーがないことを確認**

```bash
npm run build
```

Expected: エラーなし

**Step 4: コミット**

```bash
git add src/app/layout.tsx
git commit -m "feat: add viewport-fit=cover for iOS safe area support"
```

---

## Task 2: MobileTabBar コンポーネント（TDD）

**Files:**
- Create: `src/components/layout/MobileTabBar.test.tsx`
- Create: `src/components/layout/MobileTabBar.tsx`

**Step 1: テストを書く**

`src/components/layout/MobileTabBar.test.tsx` を作成:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MobileTabBar } from './MobileTabBar'

describe('MobileTabBar', () => {
  it('renders map and chat tab buttons', () => {
    render(<MobileTabBar activeTab="map" onTabChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '地図' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'チャット' })).toBeInTheDocument()
  })

  it('calls onTabChange with "map" when map tab clicked', async () => {
    const onTabChange = vi.fn()
    render(<MobileTabBar activeTab="chat" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByRole('button', { name: '地図' }))
    expect(onTabChange).toHaveBeenCalledWith('map')
  })

  it('calls onTabChange with "chat" when chat tab clicked', async () => {
    const onTabChange = vi.fn()
    render(<MobileTabBar activeTab="map" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'チャット' }))
    expect(onTabChange).toHaveBeenCalledWith('chat')
  })

  it('applies active style to map tab when activeTab is map', () => {
    const { container } = render(<MobileTabBar activeTab="map" onTabChange={vi.fn()} />)
    const mapBtn = screen.getByRole('button', { name: '地図' })
    expect(mapBtn.className).toContain('text-foreground')
  })

  it('applies muted style to chat tab when activeTab is map', () => {
    render(<MobileTabBar activeTab="map" onTabChange={vi.fn()} />)
    const chatBtn = screen.getByRole('button', { name: 'チャット' })
    expect(chatBtn.className).toContain('text-muted-foreground')
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/components/layout/MobileTabBar.test.tsx
```

Expected: FAIL（MobileTabBar not found）

**Step 3: MobileTabBar を実装**

`src/components/layout/MobileTabBar.tsx` を作成:

```typescript
import { Map, MessageCircle } from 'lucide-react'

type Tab = 'map' | 'chat'

interface MobileTabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav className="flex h-14 border-t border-border bg-background/90 backdrop-blur shrink-0 pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        aria-label="地図"
        onClick={() => onTabChange('map')}
        className={`flex flex-1 flex-col items-center justify-center gap-1 ${
          activeTab === 'map' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        <Map className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="チャット"
        onClick={() => onTabChange('chat')}
        className={`flex flex-1 flex-col items-center justify-center gap-1 ${
          activeTab === 'chat' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </nav>
  )
}
```

**Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/components/layout/MobileTabBar.test.tsx
```

Expected: PASS（5 tests）

**Step 5: コミット**

```bash
git add src/components/layout/MobileTabBar.tsx src/components/layout/MobileTabBar.test.tsx
git commit -m "feat: add MobileTabBar with bottom navigation"
```

---

## Task 3: MobileLayout コンポーネント（TDD）

**Files:**
- Create: `src/components/layout/MobileLayout.test.tsx`
- Create: `src/components/layout/MobileLayout.tsx`

**Step 1: テストを書く**

`src/components/layout/MobileLayout.test.tsx` を作成:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MobileLayout } from './MobileLayout'

describe('MobileLayout', () => {
  it('shows left panel and hides right when activeTab is map', () => {
    render(
      <MobileLayout
        left={<div data-testid="left">Map</div>}
        right={<div data-testid="right">Chat</div>}
        activeTab="map"
        onTabChange={vi.fn()}
      />
    )
    const leftWrapper = screen.getByTestId('left').parentElement!
    const rightWrapper = screen.getByTestId('right').parentElement!
    expect(leftWrapper.className).not.toContain('invisible')
    expect(rightWrapper.className).toContain('invisible')
  })

  it('shows right panel and hides left when activeTab is chat', () => {
    render(
      <MobileLayout
        left={<div data-testid="left">Map</div>}
        right={<div data-testid="right">Chat</div>}
        activeTab="chat"
        onTabChange={vi.fn()}
      />
    )
    const leftWrapper = screen.getByTestId('left').parentElement!
    const rightWrapper = screen.getByTestId('right').parentElement!
    expect(leftWrapper.className).toContain('invisible')
    expect(rightWrapper.className).not.toContain('invisible')
  })

  it('both panels remain in DOM regardless of activeTab', () => {
    render(
      <MobileLayout
        left={<div data-testid="left">Map</div>}
        right={<div data-testid="right">Chat</div>}
        activeTab="map"
        onTabChange={vi.fn()}
      />
    )
    // DOM に両方存在することを確認
    expect(screen.getByTestId('left')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('renders MobileTabBar', () => {
    render(
      <MobileLayout
        left={<div>Map</div>}
        right={<div>Chat</div>}
        activeTab="map"
        onTabChange={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '地図' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'チャット' })).toBeInTheDocument()
  })

  it('calls onTabChange when tab clicked', async () => {
    const onTabChange = vi.fn()
    render(
      <MobileLayout
        left={<div>Map</div>}
        right={<div>Chat</div>}
        activeTab="map"
        onTabChange={onTabChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'チャット' }))
    expect(onTabChange).toHaveBeenCalledWith('chat')
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/components/layout/MobileLayout.test.tsx
```

Expected: FAIL（MobileLayout not found）

**Step 3: MobileLayout を実装**

`src/components/layout/MobileLayout.tsx` を作成:

```typescript
import { ReactNode } from 'react'
import { MobileTabBar } from './MobileTabBar'

type Tab = 'map' | 'chat'

interface MobileLayoutProps {
  left: ReactNode
  right: ReactNode
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function MobileLayout({ left, right, activeTab, onTabChange }: MobileLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden">
        {/* MapPanel: invisible で DOM 維持（WebGL コンテキスト保持） */}
        <div className={`absolute inset-0 ${activeTab === 'map' ? '' : 'invisible'}`}>
          {left}
        </div>
        {/* ChatPanel */}
        <div className={`absolute inset-0 ${activeTab === 'chat' ? '' : 'invisible'}`}>
          {right}
        </div>
      </div>
      <MobileTabBar activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}
```

**Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/components/layout/MobileLayout.test.tsx
```

Expected: PASS（5 tests）

**Step 5: コミット**

```bash
git add src/components/layout/MobileLayout.tsx src/components/layout/MobileLayout.test.tsx
git commit -m "feat: add MobileLayout with tab-based panel switching"
```

---

## Task 4: page.tsx を更新

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: page.tsx の現状を確認**

現在の `src/app/page.tsx` を読んで内容を把握する。

**Step 2: page.tsx を更新**

`src/app/page.tsx` を以下に置き換える:

```typescript
'use client'

import { useState } from 'react'
import { SplitLayout } from '@/components/layout/SplitLayout'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { MapPanel } from '@/components/map/MapPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useMapSelection } from '@/hooks/useMapSelection'
import type { SelectedArea } from '@/lib/types'

export default function Home() {
  const {
    selectedArea,
    selectionMode,
    focusedPrefecture,
    selectArea,
    clearSelection,
    enterMunicipalityMode,
    exitMunicipalityMode,
  } = useMapSelection()

  const [activeTab, setActiveTab] = useState<'map' | 'chat'>('map')

  // モバイルでエリア選択時にチャットタブへ自動遷移
  const handleAreaSelect = (area: SelectedArea) => {
    selectArea(area)
    setActiveTab('chat')
  }

  const mapPanel = (
    <MapPanel
      selectedArea={selectedArea}
      onAreaSelect={handleAreaSelect}
      selectionMode={selectionMode}
      focusedPrefecture={focusedPrefecture}
      onEnterMunicipalityMode={enterMunicipalityMode}
      onExitMunicipalityMode={exitMunicipalityMode}
    />
  )

  const chatPanel = (
    <ChatPanel selectedArea={selectedArea} onAreaClear={clearSelection} />
  )

  return (
    <>
      {/* PC: スプリットスクリーン */}
      <div className="hidden md:flex h-full">
        <SplitLayout left={mapPanel} right={chatPanel} />
      </div>
      {/* モバイル: タブ切り替え */}
      <div className="flex md:hidden h-full">
        <MobileLayout
          left={mapPanel}
          right={chatPanel}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </>
  )
}
```

> **注意:** `mapPanel` と `chatPanel` を変数に切り出すことで、PC・モバイル両方に同じ JSX を渡す。React は同じ変数を 2 箇所に渡した場合、それぞれ独立したインスタンスとして扱うため問題ない。

**Step 3: 全テストが通ることを確認**

```bash
npm run test:run
```

Expected: 全テスト PASS（既存テストへの影響なし）

**Step 4: 開発サーバーで動作確認**

```bash
npm run dev
```

ブラウザで確認:
- PC（768px以上）: スプリットスクリーン表示
- モバイル（768px未満、DevTools で切替）: ボトムナビ + タブ切り替え
- 地図でエリアクリック → チャットタブに自動遷移

**Step 5: コミット**

```bash
git add src/app/page.tsx
git commit -m "feat: add responsive layout with mobile tab switching"
```

---

## 完了チェックリスト

- [ ] `npm run test:run` 全テスト PASS
- [ ] PC（768px以上）でスプリットスクリーン表示
- [ ] モバイル（768px未満）でボトムナビ表示
- [ ] 地図タブ / チャットタブが切り替わる
- [ ] 地図でエリア選択するとチャットタブに自動遷移
- [ ] iOS でホームバーとタブバーが重ならない（実機または Safari DevTools で確認）
