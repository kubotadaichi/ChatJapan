# Dark/Light Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ChatJapan にダーク/ライトテーマ切替を追加し、初回はダーク、ユーザー選択は永続化、主要UIをテーマトークン化する。

**Architecture:** `next-themes` を導入し、`ThemeProvider` で `class` ベースのテーマ制御を行う。`defaultTheme="dark"` と `enableSystem={false}` で初期表示を常にダークに固定する。UIテーマ状態は `next-themes` に集約し、地図テーマ状態は将来別キーで独立管理できるよう、結合を作らない。

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui tokens, next-themes, Vitest + Testing Library

---

### Task 1: Header のテーマトグル仕様をテストで固定する

**Files:**
- Create: `src/components/layout/Header.test.tsx`
- Modify: `src/components/layout/Header.tsx`
- Test: `src/components/layout/Header.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Header } from './Header'

const mockSetTheme = vi.fn()

vi.mock('next-auth/react', () => ({
  useSession: vi.fn().mockReturnValue({ data: null }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme: mockSetTheme }),
}))

describe('Header', () => {
  it('toggles to light when current theme is dark', async () => {
    const user = userEvent.setup()
    render(<Header />)

    await user.click(screen.getByRole('button', { name: /テーマ切替/i }))

    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/layout/Header.test.tsx`
Expected: FAIL（テーマ切替ボタン未実装、または `next-themes` 未導入）

**Step 3: Write minimal implementation**

```tsx
// Header.tsx の差分イメージ
import { useTheme } from 'next-themes'

const { resolvedTheme, setTheme } = useTheme()
const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'

<Button
  variant="ghost"
  size="sm"
  aria-label="テーマ切替"
  onClick={() => setTheme(nextTheme)}
>
  テーマ
</Button>
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/layout/Header.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Header.test.tsx
git commit -m "test: add header theme toggle behavior"
```

### Task 2: ThemeProvider を追加し、default dark をアプリに適用する

**Files:**
- Create: `src/components/providers/ThemeProvider.tsx`
- Create: `src/components/providers/ThemeProvider.test.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `src/components/providers/ThemeProvider.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from './ThemeProvider'

describe('ThemeProvider', () => {
  it('renders children', () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>
    )
    expect(screen.getByText('child')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/providers/ThemeProvider.test.tsx`
Expected: FAIL（`ThemeProvider` ファイル未作成）

**Step 3: Write minimal implementation**

```tsx
// src/components/providers/ThemeProvider.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="chatjapan-ui-theme"
    >
      {children}
    </NextThemesProvider>
  )
}
```

```tsx
// src/app/layout.tsx の差分イメージ
<html lang="ja" suppressHydrationWarning>
  <body className={`${inter.className} overflow-hidden flex flex-col h-screen`}>
    <ThemeProvider>
      <AuthProvider>
        <Header />
        <div className="flex-1 overflow-hidden">{children}</div>
      </AuthProvider>
    </ThemeProvider>
  </body>
</html>
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/providers/ThemeProvider.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json package-lock.json src/components/providers/ThemeProvider.tsx src/components/providers/ThemeProvider.test.tsx src/app/layout.tsx
git commit -m "feat: add next-themes provider with default dark"
```

### Task 3: ヘッダー/分割レイアウト/チャットをテーマトークンへ置換する

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/SplitLayout.tsx`
- Modify: `src/components/chat/ChatPanel.tsx`
- Modify: `src/components/chat/MessageList.tsx`
- Modify: `src/components/chat/ChatPanel.test.tsx`
- Modify: `src/components/layout/SplitLayout.test.tsx`
- Test: `src/components/chat/ChatPanel.test.tsx`
- Test: `src/components/layout/SplitLayout.test.tsx`

**Step 1: Write the failing tests**

```tsx
// ChatPanel.test.tsx に追加
it('uses theme token classes in panel header', () => {
  render(<ChatPanel selectedArea={null} />)
  const title = screen.getByText('ChatJapan')
  expect(title.closest('div')).toHaveClass('bg-background')
})

// SplitLayout.test.tsx に追加
it('uses border token class for panel separator', () => {
  const { container } = render(<SplitLayout left={<div />} right={<div />} />)
  expect(container.querySelector('.border-border')).toBeInTheDocument()
})
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/components/chat/ChatPanel.test.tsx src/components/layout/SplitLayout.test.tsx`
Expected: FAIL（`bg-white` / `border-zinc-200` が残っている）

**Step 3: Write minimal implementation**

```tsx
// 置換例
// Header: bg-white -> bg-background, text-zinc-500 -> text-muted-foreground
// SplitLayout: border-zinc-200 -> border-border
// ChatPanel: text-zinc-900 -> text-foreground
// MessageList: bg-zinc-100 -> bg-muted, text-zinc-900 -> text-foreground
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/chat/ChatPanel.test.tsx src/components/layout/SplitLayout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/SplitLayout.tsx src/components/chat/ChatPanel.tsx src/components/chat/MessageList.tsx src/components/chat/ChatPanel.test.tsx src/components/layout/SplitLayout.test.tsx
git commit -m "refactor: switch layout and chat UI to theme tokens"
```

### Task 4: MapPanel のオーバーレイ/メニューをテーマトークン化する

**Files:**
- Modify: `src/components/map/MapPanel.tsx`
- Modify: `src/components/map/MapPanel.test.tsx`
- Test: `src/components/map/MapPanel.test.tsx`

**Step 1: Write the failing test**

```tsx
it('uses theme token class for selected-area overlay', () => {
  const area = { name: '渋谷区', code: '13113', prefCode: '13', level: 'municipality' } as const
  render(
    <MapPanel
      selectedArea={area}
      onAreaSelect={vi.fn()}
      selectionMode="prefecture"
      focusedPrefecture={null}
      onEnterMunicipalityMode={vi.fn()}
      onExitMunicipalityMode={vi.fn()}
    />
  )
  expect(screen.getByText('渋谷区を選択中').closest('div')).toHaveClass('bg-card')
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/map/MapPanel.test.tsx`
Expected: FAIL（`bg-white` クラスが残っている）

**Step 3: Write minimal implementation**

```tsx
// 置換例
// bg-white/90 -> bg-card/90
// bg-white -> bg-card
// border-zinc-200 -> border-border
// hover:bg-zinc-100 -> hover:bg-accent
// text-zinc-500/600 -> text-muted-foreground
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/map/MapPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/map/MapPanel.tsx src/components/map/MapPanel.test.tsx
git commit -m "refactor: apply theme tokens to map overlays"
```

### Task 5: 全体回帰確認と最終コミット

**Files:**
- Modify: `README.md`（必要時のみ。テーマ仕様を追記）
- Test: `src/components/layout/Header.test.tsx`
- Test: `src/components/providers/ThemeProvider.test.tsx`
- Test: `src/components/chat/ChatPanel.test.tsx`
- Test: `src/components/layout/SplitLayout.test.tsx`
- Test: `src/components/map/MapPanel.test.tsx`

**Step 1: Run targeted tests**

Run: `npm run test:run -- src/components/layout/Header.test.tsx src/components/providers/ThemeProvider.test.tsx src/components/chat/ChatPanel.test.tsx src/components/layout/SplitLayout.test.tsx src/components/map/MapPanel.test.tsx`
Expected: PASS

**Step 2: Run full test suite**

Run: `npm run test:run`
Expected: PASS

**Step 3: Manual verification**

Run: `npm run dev`
Expected:
- 初回アクセスはダーク
- トグルでライト/ダーク切替
- リロード後も設定維持
- 地図タイル表示は従来通り

**Step 4: Final commit**

```bash
git add src/app/layout.tsx src/components/providers/ThemeProvider.tsx src/components/providers/ThemeProvider.test.tsx src/components/layout/Header.tsx src/components/layout/Header.test.tsx src/components/layout/SplitLayout.tsx src/components/chat/ChatPanel.tsx src/components/chat/MessageList.tsx src/components/map/MapPanel.tsx src/components/chat/ChatPanel.test.tsx src/components/layout/SplitLayout.test.tsx src/components/map/MapPanel.test.tsx package.json package-lock.json README.md
git commit -m "feat: add dark/light UI theme with default dark"
```
