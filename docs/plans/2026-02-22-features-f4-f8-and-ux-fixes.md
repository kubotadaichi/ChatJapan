# Features F4–F8 + UX Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 bugs/UX gaps (map-close conversation reset, loading spinner, tool-call display), then implement F4–F8 from the feature backlog.

**Architecture:** Bug fixes first (layout stability, streaming UX), then F4 (area via chat), F5 (multi-area), F6 (onboarding), F7/F8 (agent modes).

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, @ai-sdk/react v3 (`UIMessage`, `useChat`, `DefaultChatTransport`), ai (`streamText`, `tool`, `stepCountIs`), react-resizable-panels.

---

## Background: @ai-sdk/react v3 Key Facts

- `UIMessage.parts` is an array. Each part has `type`.
  - `{ type: 'text', text: string }` — message text
  - `{ type: 'tool-invocation', toolInvocationId: string, toolName: string, state: 'partial-call' | 'call' | 'result', args?: unknown, result?: unknown }` — tool calls
- `useChat` returns `status: 'ready' | 'submitted' | 'streaming' | 'error'`
- `isLoading = status === 'submitted' || status === 'streaming'`
- Tools defined in `tools.ts` use `inputSchema` (not `parameters`).
- `tool({ inputSchema: z.object({...}), execute: async (...) => ... })`

---

## Task 1: BUG-1 — 地図を閉じると会話がリセットされる

**Root cause:** `ThreeColumnLayout` and `MobileLayout` render structurally different JSX trees based on `center`/`isMapOpen`. When the structure changes, React unmounts `ChatPanel` (different tree position → state lost).

For example, in `ThreeColumnLayout`:
- `center=null` → `right` is in `<div className="h-full w-full">{right}</div>`
- `center=defined` → `right` is inside `<PanelGroup><Panel>{right}</Panel></PanelGroup>`
These are different element types → React unmounts and remounts `ChatPanel` → messages cleared.

**Fix:** In both layouts, keep `right`/`chat` at a stable tree position regardless of `center`/`isMapOpen`. Always render the same element type wrapping `right`; just change CSS classes.

**Files:**
- Modify: `src/components/layout/ThreeColumnLayout.tsx`
- Modify: `src/components/layout/MobileLayout.tsx`
- Test: `src/components/layout/ThreeColumnLayout.test.tsx`
- Test: `src/components/layout/MobileLayout.test.tsx`

---

### Step 1-1: Write a failing test for ThreeColumnLayout remounting

Add this test to `src/components/layout/ThreeColumnLayout.test.tsx`:

```tsx
import { useState } from 'react'
import { render, screen, act } from '@testing-library/react'

function Stateful() {
  const [n, setN] = useState(0)
  return <button onClick={() => setN((c) => c + 1)} data-testid="counter">{n}</button>
}

it('right content is not remounted when center prop changes', () => {
  const { rerender } = render(
    <ThreeColumnLayout right={<Stateful />} />
  )
  // Increment counter to 1
  act(() => screen.getByTestId('counter').click())
  expect(screen.getByTestId('counter').textContent).toBe('1')

  // Add a center — right must NOT remount (counter must stay 1)
  rerender(
    <ThreeColumnLayout center={<div>map</div>} right={<Stateful />} />
  )
  expect(screen.getByTestId('counter').textContent).toBe('1')

  // Remove center again — counter must still be 1
  rerender(
    <ThreeColumnLayout right={<Stateful />} />
  )
  expect(screen.getByTestId('counter').textContent).toBe('1')
})
```

Run: `npx vitest run src/components/layout/ThreeColumnLayout.test.tsx`
Expected: FAIL (counter resets to 0 after rerender)

---

### Step 1-2: Fix ThreeColumnLayout

Replace entire `src/components/layout/ThreeColumnLayout.tsx`:

```tsx
'use client'

import { ReactNode } from 'react'

interface ThreeColumnLayoutProps {
  sidebar?: ReactNode
  center?: ReactNode
  right: ReactNode
}

export function ThreeColumnLayout({ sidebar, center, right }: ThreeColumnLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {sidebar && <aside className="h-full shrink-0">{sidebar}</aside>}
      <div className="min-w-0 flex-1 flex h-full">
        <div className={`min-w-0 border-r border-border ${center ? 'flex-1' : 'hidden'}`}>
          {center}
        </div>
        <div className={`h-full ${center ? 'w-[480px] shrink-0' : 'flex-1'}`}>
          {right}
        </div>
      </div>
    </div>
  )
}
```

Note: This removes `react-resizable-panels` in favour of CSS flex. The resizable split panel is sacrificed to fix the remounting bug. The chat panel uses a fixed width of `480px` when map is open.

---

### Step 1-3: Run test to verify it passes

Run: `npx vitest run src/components/layout/ThreeColumnLayout.test.tsx`
Expected: All tests PASS (including the new counter test)

---

### Step 1-4: Write failing test for MobileLayout remounting

Add to `src/components/layout/MobileLayout.test.tsx`:

```tsx
import { useState } from 'react'
import { render, screen, act } from '@testing-library/react'
import { MobileLayout } from './MobileLayout'

function Stateful() {
  const [n, setN] = useState(0)
  return <button onClick={() => setN((c) => c + 1)} data-testid="counter">{n}</button>
}

it('chat is not remounted when isMapOpen toggles', () => {
  const { rerender } = render(
    <MobileLayout chat={<Stateful />} isMapOpen={false} />
  )
  act(() => screen.getByTestId('counter').click())
  expect(screen.getByTestId('counter').textContent).toBe('1')

  rerender(
    <MobileLayout map={<div>map</div>} chat={<Stateful />} isMapOpen={true} />
  )
  expect(screen.getByTestId('counter').textContent).toBe('1')

  rerender(
    <MobileLayout chat={<Stateful />} isMapOpen={false} />
  )
  expect(screen.getByTestId('counter').textContent).toBe('1')
})
```

Run: `npx vitest run src/components/layout/MobileLayout.test.tsx`
Expected: FAIL (counter resets)

---

### Step 1-5: Fix MobileLayout

Replace `src/components/layout/MobileLayout.tsx`:

```tsx
import { ReactNode } from 'react'

interface MobileLayoutProps {
  sidebar?: ReactNode
  map?: ReactNode
  chat: ReactNode
  isMapOpen: boolean
}

export function MobileLayout({ sidebar, map, chat, isMapOpen }: MobileLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      {sidebar ? <div className="shrink-0">{sidebar}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={`overflow-hidden border-b border-border ${
            isMapOpen ? 'h-[45%] min-h-[200px]' : 'hidden'
          }`}
        >
          {map}
        </div>
        <div className="min-h-0 flex-1">{chat}</div>
      </div>
    </div>
  )
}
```

---

### Step 1-6: Run test to verify it passes

Run: `npx vitest run src/components/layout/MobileLayout.test.tsx`
Expected: All tests PASS

---

### Step 1-7: Run all tests

Run: `npx vitest run`
Expected: All tests PASS

---

### Step 1-8: Commit

```bash
git add src/components/layout/ThreeColumnLayout.tsx src/components/layout/MobileLayout.tsx src/components/layout/ThreeColumnLayout.test.tsx src/components/layout/MobileLayout.test.tsx
git commit -m "fix: prevent ChatPanel remount when map panel opens/closes"
```

---

## Task 2: UX-1 — ローディングスピン表示

Show a typing indicator / spinner in `MessageList` while waiting for the first streaming token (`status === 'submitted'`).

**Files:**
- Modify: `src/components/chat/MessageList.tsx` (add `isLoading` prop + spinner)
- Modify: `src/components/chat/ChatPanel.tsx` (pass `isLoading` to MessageList)
- Test: `src/components/chat/MessageList.test.tsx`

---

### Step 2-1: Write failing test

Add to `src/components/chat/MessageList.test.tsx`:

```tsx
it('ローディング中にスピナーが表示される', () => {
  render(<MessageList messages={[makeMessage('user', '質問')]} isLoading={true} />)
  expect(screen.getByRole('status')).toBeInTheDocument()
})

it('ローディング中でなければスピナーは表示されない', () => {
  render(<MessageList messages={[makeMessage('user', '質問')]} isLoading={false} />)
  expect(screen.queryByRole('status')).toBeNull()
})
```

Run: `npx vitest run src/components/chat/MessageList.test.tsx`
Expected: FAIL (isLoading prop does not exist yet)

---

### Step 2-2: Update MessageList

In `src/components/chat/MessageList.tsx`, update the interface and add spinner:

```tsx
interface MessageListProps {
  messages: UIMessage[]
  isLoading?: boolean
}

// Add this component:
function TypingIndicator() {
  return (
    <div className="flex justify-start" role="status" aria-label="回答を生成中">
      <div className="rounded-2xl px-4 py-3 bg-muted/80">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
        </div>
      </div>
    </div>
  )
}
```

In `MessageList`, accept and use `isLoading`:

```tsx
export function MessageList({ messages, isLoading = false }: MessageListProps) {
  // ... existing code ...

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 space-y-5">
        {messages.map((message) => {
          // ... existing message rendering ...
        })}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
```

---

### Step 2-3: Pass isLoading from ChatPanel

In `src/components/chat/ChatPanel.tsx`, update the `<MessageList>` call:

```tsx
<MessageList messages={messages} isLoading={isLoading} />
```

---

### Step 2-4: Run test

Run: `npx vitest run src/components/chat/MessageList.test.tsx`
Expected: All tests PASS

---

### Step 2-5: Commit

```bash
git add src/components/chat/MessageList.tsx src/components/chat/ChatPanel.tsx src/components/chat/MessageList.test.tsx
git commit -m "feat: show typing indicator while AI is generating response"
```

---

## Task 3: UX-2 — ツール呼び出し表示

When the LLM invokes a tool (e-Stat API call etc.), show a compact inline indicator in the message list so the user knows what's happening.

In `@ai-sdk/react` v3, tool calls appear as parts in the `messages` array:
```ts
{ type: 'tool-invocation', toolName: string, state: 'call' | 'result', toolInvocationId: string, args?: unknown, result?: unknown }
```
We render `state === 'call'` parts (tool invoked, awaiting result) as a spinner row.

**Files:**
- Modify: `src/components/chat/MessageList.tsx`
- Test: `src/components/chat/MessageList.test.tsx`

---

### Step 3-1: Write failing test

Add to `src/components/chat/MessageList.test.tsx`:

```tsx
function makeToolCallMessage(toolName: string): UIMessage {
  return {
    id: '2',
    role: 'assistant',
    parts: [
      {
        type: 'tool-invocation' as const,
        toolInvocationId: 'inv-1',
        toolName,
        state: 'call' as const,
        args: {},
      },
    ],
  } as UIMessage
}

it('ツール呼び出し中に呼び出し中インジケーターが表示される', () => {
  render(<MessageList messages={[makeToolCallMessage('fetchStatistics')]} isLoading={true} />)
  expect(screen.getByText(/統計データを取得中/)).toBeInTheDocument()
})

it('ツール呼び出し結果が返ったあとはインジケーターが消える', () => {
  const msg: UIMessage = {
    id: '3',
    role: 'assistant',
    parts: [
      {
        type: 'tool-invocation' as const,
        toolInvocationId: 'inv-2',
        toolName: 'fetchStatistics',
        state: 'result' as const,
        args: {},
        result: {},
      },
    ],
  } as UIMessage
  render(<MessageList messages={[msg]} isLoading={false} />)
  expect(screen.queryByText(/統計データを取得中/)).toBeNull()
})
```

Run: `npx vitest run src/components/chat/MessageList.test.tsx`
Expected: FAIL

---

### Step 3-2: Add tool label mapping and ToolCallIndicator

In `src/components/chat/MessageList.tsx`, add before `AssistantMessage`:

```tsx
const TOOL_LABELS: Record<string, string> = {
  listStatisticsCategories: '統計カテゴリを確認中',
  fetchStatistics: '統計データを取得中',
  searchStatsList: '統計表を検索中',
  fetchStatsByStatsId: 'データを取得中',
  getAreaInfo: 'エリア情報を確認中',
  addArea: 'エリアを設定中',
}

function ToolCallIndicator({ toolName }: { toolName: string }) {
  const label = TOOL_LABELS[toolName] ?? 'データを処理中'
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-muted/50 text-sm text-muted-foreground">
        <svg
          className="h-3.5 w-3.5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {label}…
      </div>
    </div>
  )
}
```

Then in `MessageList`'s message rendering, handle tool-invocation parts:

```tsx
{messages.map((message) => {
  const textParts = message.parts.filter((p) => p.type === 'text')
  const toolCallParts = message.parts.filter(
    (p) => p.type === 'tool-invocation' && p.state === 'call'
  )
  const text = textParts.map((p) => ('text' in p ? p.text : '')).join('')

  return (
    <div key={message.id} className="space-y-2">
      {toolCallParts.map((p) => (
        <div className="flex justify-start" key={'toolInvocationId' in p ? p.toolInvocationId : p.type}>
          <ToolCallIndicator toolName={'toolName' in p ? p.toolName : ''} />
        </div>
      ))}
      {text && (
        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {message.role === 'assistant' ? (
            <AssistantMessage text={text} />
          ) : (
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-foreground text-background rounded-br-md">
              {text}
            </div>
          )}
        </div>
      )}
    </div>
  )
})}
```

---

### Step 3-3: Run test

Run: `npx vitest run src/components/chat/MessageList.test.tsx`
Expected: All tests PASS

---

### Step 3-4: Commit

```bash
git add src/components/chat/MessageList.tsx src/components/chat/MessageList.test.tsx
git commit -m "feat: show tool invocation indicator while LLM calls e-Stat API"
```

---

## Task 4: F4 — 自然会話でエリア追加

Allow the LLM to call `addArea(name, code, level)` when it recognizes a place name in conversation. The frontend detects this tool result in messages and updates the map selection.

**Files:**
- Modify: `src/lib/llm/tools.ts` (add `addArea` tool)
- Modify: `src/components/chat/ChatPanel.tsx` (watch messages, call onAreaAdd)
- Modify: `src/app/page.tsx` (pass `onAreaAdd` to ChatPanel)
- Test: `src/lib/llm/tools.test.ts`

---

### Step 4-1: Write failing test for addArea tool

Add to `src/lib/llm/tools.test.ts`:

```ts
it('addArea ツールが area 情報を返す', async () => {
  const tools = createStatisticsTools('dummy-key')
  const result = await tools.addArea.execute({
    name: '渋谷区',
    code: '13113',
    prefCode: '13',
    level: 'municipality',
  }, {} as never)
  expect(result).toEqual({
    name: '渋谷区',
    code: '13113',
    prefCode: '13',
    level: 'municipality',
  })
})
```

Run: `npx vitest run src/lib/llm/tools.test.ts`
Expected: FAIL (addArea not defined)

---

### Step 4-2: Add addArea tool to tools.ts

In `src/lib/llm/tools.ts`, add to the return object of `createStatisticsTools`:

```ts
addArea: tool({
  description: `ユーザーが言及した地名をエリアとして地図上に追加します。
ユーザーが特定の都市・区・市町村・都道府県名を言及したとき、このツールを呼び出してエリアを設定してください。
areaCodeには e-Stat の地域コードを使用してください（都道府県: 2桁, 市区町村: 5桁）。`,
  inputSchema: z.object({
    name: z.string().describe('エリア名（例: 渋谷区, 東京都）'),
    code: z.string().describe('地域コード（都道府県2桁 or 市区町村5桁, 例: 13113）'),
    prefCode: z.string().describe('都道府県コード2桁（例: 13）'),
    level: z.enum(['prefecture', 'municipality']).describe('エリアの粒度'),
  }),
  execute: async ({ name, code, prefCode, level }) => {
    return { name, code, prefCode, level }
  },
}),
```

---

### Step 4-3: Run test

Run: `npx vitest run src/lib/llm/tools.test.ts`
Expected: All tests PASS

---

### Step 4-4: Add onAreaAdd prop to ChatPanel

In `src/components/chat/ChatPanel.tsx`:

Update `ChatPanelProps`:
```ts
interface ChatPanelProps {
  selectedArea: SelectedArea | null
  onAreaClear: () => void
  onAreaAdd?: (area: SelectedArea) => void   // ← add this
  sessionId: string | null
  onSessionCreated: (id: string) => void
  onTitleGenerated: () => void
  isMapOpen?: boolean
  onToggleMap?: () => void
}
```

Update function signature to destructure `onAreaAdd`.

Add a ref to track processed invocations, and a useEffect that scans messages for `addArea` tool results:

```ts
const processedToolInvocations = useRef<Set<string>>(new Set())

useEffect(() => {
  if (!onAreaAdd) return
  messages.forEach((message) => {
    message.parts.forEach((part) => {
      if (
        part.type === 'tool-invocation' &&
        'toolName' in part &&
        part.toolName === 'addArea' &&
        part.state === 'result' &&
        'toolInvocationId' in part
      ) {
        const invId = part.toolInvocationId as string
        if (!processedToolInvocations.current.has(invId)) {
          processedToolInvocations.current.add(invId)
          const result = (part as { result: SelectedArea }).result
          onAreaAdd(result)
        }
      }
    })
  })
}, [messages, onAreaAdd])
```

---

### Step 4-5: Pass onAreaAdd from page.tsx

In `src/app/page.tsx`, update `chatPane`:

```tsx
const chatPane = (
  <ChatPanel
    selectedArea={selectedArea}
    onAreaClear={clearSelection}
    onAreaAdd={selectArea}        // ← add this line
    sessionId={currentSessionId}
    onSessionCreated={handleSessionCreated}
    onTitleGenerated={handleTitleGenerated}
    isMapOpen={isMapOpen}
    onToggleMap={() => setIsMapOpen((prev) => !prev)}
  />
)
```

---

### Step 4-6: Run all tests

Run: `npx vitest run`
Expected: All tests PASS

---

### Step 4-7: Commit

```bash
git add src/lib/llm/tools.ts src/components/chat/ChatPanel.tsx src/app/page.tsx src/lib/llm/tools.test.ts
git commit -m "feat: F4 - allow LLM to set map area via addArea tool call"
```

---

## Task 5: F5 — 複数地点選択

Change area selection from single (`SelectedArea | null`) to multiple (`SelectedArea[]`). The map highlights multiple areas; the chat input shows chips for each area; the LLM gets context for all selected areas.

**Files:**
- Modify: `src/hooks/useMapSelection.ts`
- Modify: `src/hooks/useMapSelection.test.ts`
- Modify: `src/components/chat/ChatInput.tsx` (multi-chip display)
- Modify: `src/components/chat/ChatPanel.tsx` (pass areas array)
- Modify: `src/app/api/chat/route.ts` (multi-area system prompt)
- Modify: `src/app/page.tsx` (wire up new API)
- Modify: `src/components/map/MapPanel.tsx` (accept areas array, highlight all)

---

### Step 5-1: Update useMapSelection

In `src/hooks/useMapSelection.ts`, change `selectedArea: SelectedArea | null` to `selectedAreas: SelectedArea[]`:

```ts
export function useMapSelection() {
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([])
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('prefecture')
  const [focusedPrefecture, setFocusedPrefecture] = useState<SelectedArea | null>(null)

  const selectArea = (area: SelectedArea) => {
    setSelectedAreas((prev) => {
      const idx = prev.findIndex((a) => a.code === area.code && a.level === area.level)
      if (idx >= 0) {
        // Toggle off
        return prev.filter((_, i) => i !== idx)
      }
      return [...prev, area]
    })
  }

  const clearSelection = () => setSelectedAreas([])

  const enterMunicipalityMode = (prefecture: SelectedArea) => {
    setFocusedPrefecture(prefecture)
    setSelectionMode('municipality')
    setSelectedAreas([])
  }

  const exitMunicipalityMode = () => {
    setFocusedPrefecture(null)
    setSelectionMode('prefecture')
    setSelectedAreas([])
  }

  return {
    selectedAreas,
    selectionMode,
    focusedPrefecture,
    selectArea,
    clearSelection,
    enterMunicipalityMode,
    exitMunicipalityMode,
  }
}
```

---

### Step 5-2: Update useMapSelection tests

In `src/hooks/useMapSelection.test.ts`, update tests to use `selectedAreas` (array) instead of `selectedArea` (single). Specifically:
- `result.current.selectedArea` → `result.current.selectedAreas[0]` or check array length
- Add test for multiple selection

Example patterns:
```ts
// Single selection
act(() => result.current.selectArea(area1))
expect(result.current.selectedAreas).toHaveLength(1)
expect(result.current.selectedAreas[0]).toEqual(area1)

// Toggle off
act(() => result.current.selectArea(area1))
expect(result.current.selectedAreas).toHaveLength(0)

// Multiple selection
act(() => result.current.selectArea(area1))
act(() => result.current.selectArea(area2))
expect(result.current.selectedAreas).toHaveLength(2)
```

Run: `npx vitest run src/hooks/useMapSelection.test.ts`
Expected: All tests PASS

---

### Step 5-3: Update ChatInput to show multiple chips

In `src/components/chat/ChatInput.tsx`:

Change prop from `selectedArea: SelectedArea | null` to `selectedAreas: SelectedArea[]`.

Replace single chip:
```tsx
{selectedAreas.length > 0 && (
  <div className="mb-2 flex flex-wrap gap-1">
    {selectedAreas.map((area) => (
      <div
        key={area.code}
        data-testid="selected-area-chip"
        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
      >
        <MapPinned className="h-3.5 w-3.5" />
        <span>{area.name}</span>
        <button
          type="button"
          aria-label={`${area.name}の選択を解除`}
          onClick={() => onAreaRemove(area)}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background/70"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    ))}
    {selectedAreas.length > 1 && (
      <button
        type="button"
        onClick={onAreaClear}
        className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
      >
        <X className="h-3 w-3" />
        すべて解除
      </button>
    )}
  </div>
)}
```

Update `ChatInputProps`:
```ts
interface ChatInputProps {
  selectedAreas: SelectedArea[]      // was: selectedArea: SelectedArea | null
  categories: CategoryCoverageItem[]
  onAreaClear: () => void
  onAreaRemove: (area: SelectedArea) => void  // new: remove single area
  // ... rest unchanged
}
```

---

### Step 5-4: Update ChatPanel

In `src/components/chat/ChatPanel.tsx`:

Change `selectedArea: SelectedArea | null` prop to `selectedAreas: SelectedArea[]`.

Update `transport` body:
```ts
body: () => ({ selectedAreas: selectedAreasRef.current }),
```

Update `ChatInput` usage:
```tsx
<ChatInput
  selectedAreas={selectedAreas}
  onAreaClear={onAreaClear}
  onAreaRemove={(area) => { /* call parent to remove single */ }}
  // ...
/>
```

We need a new `onAreaRemove` prop on ChatPanel:
```ts
interface ChatPanelProps {
  selectedAreas: SelectedArea[]      // changed from selectedArea
  onAreaClear: () => void
  onAreaRemove: (area: SelectedArea) => void  // new
  onAreaAdd?: (area: SelectedArea) => void
  // ...
}
```

Update session-save code to use first area for backward compat:
```ts
const area = selectedAreasRef.current[0] ?? null
```

---

### Step 5-5: Update API route for multiple areas

In `src/app/api/chat/route.ts`:

Change body parsing:
```ts
const { messages, selectedAreas } = (await req.json()) as {
  messages: UIMessage[]
  selectedAreas?: SelectedArea[]
}
```

Update `areaContext`:
```ts
const areaContext =
  selectedAreas && selectedAreas.length > 0
    ? `選択中のエリア（${selectedAreas.length}件）:\n` +
      selectedAreas
        .map((a, i) => `${i + 1}. ${a.name} (コード: ${a.code}, 都道府県コード: ${a.prefCode})`)
        .join('\n')
    : '特定のエリアは選択されていません。ユーザーに地図でエリアを選択するよう案内してください。'
```

---

### Step 5-6: Update page.tsx

In `src/app/page.tsx`:

Destructure `selectedAreas` instead of `selectedArea` from `useMapSelection`.

Update `chatPane`:
```tsx
const chatPane = (
  <ChatPanel
    selectedAreas={selectedAreas}
    onAreaClear={clearSelection}
    onAreaRemove={(area) => selectArea(area)}  // selectArea already toggles
    onAreaAdd={selectArea}
    // ...
  />
)
```

Update `mapPane` to pass `selectedAreas`:
```tsx
<MapPanel
  selectedAreas={selectedAreas}   // changed from selectedArea
  onAreaSelect={selectArea}
  // ...
/>
```

---

### Step 5-7: Update MapPanel props

In `src/components/map/MapPanel.tsx`, change:
```ts
selectedArea: SelectedArea | null  →  selectedAreas: SelectedArea[]
```

Update all highlight logic to iterate over `selectedAreas` and call `setFeatureState` for each.

Key change: For prefecture highlight, clear all states first, then re-apply for all selected areas:
```ts
// On selectedAreas change, update feature states
useEffect(() => {
  if (!map) return
  // Clear all previous states
  // Then highlight each selectedArea in selectedAreas
}, [selectedAreas, map])
```

---

### Step 5-8: Run all tests

Run: `npx vitest run`
Expected: All tests PASS (update any snapshot tests that reference selectedArea)

---

### Step 5-9: Commit

```bash
git add src/hooks/useMapSelection.ts src/hooks/useMapSelection.test.ts src/components/chat/ChatInput.tsx src/components/chat/ChatPanel.tsx src/app/api/chat/route.ts src/app/page.tsx src/components/map/MapPanel.tsx
git commit -m "feat: F5 - support multiple area selection"
```

---

## Task 6: F6 — 初利用時ガイダンス

Show an onboarding modal on first visit. After dismissal, store `'guided'` in `localStorage` to not show again.

**Files:**
- Create: `src/components/onboarding/OnboardingModal.tsx`
- Modify: `src/app/page.tsx`

---

### Step 6-1: Write failing test

Create `src/components/onboarding/OnboardingModal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OnboardingModal } from './OnboardingModal'

describe('OnboardingModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初回アクセス時にモーダルが表示される', () => {
    render(<OnboardingModal />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('閉じるボタンでモーダルが消える', () => {
    render(<OnboardingModal />)
    fireEvent.click(screen.getByRole('button', { name: /使い方を理解しました|はじめる/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('localStorageに guided フラグが保存される', () => {
    render(<OnboardingModal />)
    fireEvent.click(screen.getByRole('button', { name: /使い方を理解しました|はじめる/ }))
    expect(localStorage.getItem('guided')).toBe('1')
  })

  it('すでに guided フラグがある場合はモーダルを表示しない', () => {
    localStorage.setItem('guided', '1')
    render(<OnboardingModal />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

Run: `npx vitest run src/components/onboarding/OnboardingModal.test.tsx`
Expected: FAIL (file does not exist)

---

### Step 6-2: Create OnboardingModal

Create `src/components/onboarding/OnboardingModal.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MapPinned, MessageSquare, BarChart3, X } from 'lucide-react'

export function OnboardingModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('guided')) {
      setOpen(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('guided', '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          aria-label="閉じる"
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="onboarding-title" className="mb-1 text-lg font-semibold">
          ChatJapan へようこそ
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          日本の統計データをAIと一緒に探索しましょう。
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">1. 地図でエリアを選択</p>
              <p className="text-xs text-muted-foreground">都道府県や市区町村をクリックして選択します。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">2. 質問する</p>
              <p className="text-xs text-muted-foreground">例:「この地域の人口構成を教えて」</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">3. 統計データで回答</p>
              <p className="text-xs text-muted-foreground">e-Stat（政府統計ポータル）のデータで回答します。</p>
            </div>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full">
          はじめる
        </Button>
      </div>
    </div>
  )
}
```

---

### Step 6-3: Add to page.tsx

In `src/app/page.tsx`:

```tsx
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'

// Inside Home() return:
return (
  <>
    <OnboardingModal />
    {/* rest of layout */}
  </>
)
```

---

### Step 6-4: Run test

Run: `npx vitest run src/components/onboarding/OnboardingModal.test.tsx`
Expected: All tests PASS

---

### Step 6-5: Commit

```bash
git add src/components/onboarding/OnboardingModal.tsx src/components/onboarding/OnboardingModal.test.tsx src/app/page.tsx
git commit -m "feat: F6 - show onboarding modal on first visit"
```

---

## Task 7: F7 — 特化エージェント（マーケティング担当）

Add an agent mode selector UI. Modes: デフォルト / マーケティング担当. Each mode switches the system prompt sent to the LLM.

**Files:**
- Create: `src/lib/llm/prompts.ts` (system prompts per mode)
- Create: `src/components/chat/AgentModeSelector.tsx` (mode selection UI)
- Modify: `src/app/api/chat/route.ts` (accept `agentMode` in body)
- Modify: `src/components/chat/ChatPanel.tsx` (hold agentMode state, pass to API)
- Modify: `src/components/chat/ChatInput.tsx` (render AgentModeSelector)

---

### Step 7-1: Write failing test for prompts

Create `src/lib/llm/prompts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getSystemPrompt } from './prompts'

describe('getSystemPrompt', () => {
  it('デフォルトモードのプロンプトを返す', () => {
    const prompt = getSystemPrompt('default', '東京都')
    expect(prompt).toContain('ChatJapan')
    expect(prompt).toContain('東京都')
  })

  it('マーケティングモードのプロンプトを返す', () => {
    const prompt = getSystemPrompt('marketing', '渋谷区')
    expect(prompt).toContain('マーケティング')
    expect(prompt).toContain('渋谷区')
  })
})
```

Run: `npx vitest run src/lib/llm/prompts.test.ts`
Expected: FAIL

---

### Step 7-2: Create prompts.ts

Create `src/lib/llm/prompts.ts`:

```ts
export type AgentMode = 'default' | 'marketing'

export function getSystemPrompt(mode: AgentMode, areaContext: string): string {
  if (mode === 'marketing') {
    return `あなたは「ChatJapan」のマーケティングアナリストです。
日本の政府統計ポータル「e-Stat」のデータを活用して、マーケティング担当者の意思決定を支援します。

## あなたの役割
- 商圏分析・出店戦略・ターゲット設定のための統計データ解説
- 競合や市場規模の推計に役立つ人口・商業データの活用
- エリアの特性（年齢構成・世帯数・商業集積度）のサマリー提供

## 回答のルール
1. **必ず日本語で回答する**
2. **ビジネス判断に直結するインサイトを優先する**（数値の羅列より解釈を重視）
3. **データの出典と調査年度を明示する**
4. **競合分析・ターゲット分析の観点を添える**
5. **coverageMismatch または note が返った場合は、使用したデータレベルを明記する**

## 出力フォーマット
- 分析結果はMarkdownのテーブルで比較
- 重要ポイントはリストで箇条書き
- 見出しは##（H2）以下を使い構造化する

## エリアコンテキスト
${areaContext}`
  }

  return `あなたは「ChatJapan」の統計データアナリストです。
日本の政府統計ポータル「e-Stat」のデータを活用して、ユーザーの質問に回答します。

## あなたの役割
- エリアの統計データ（人口・商業・経済など）を分かりやすく解説する
- データに基づいた客観的な分析と洞察を提供する
- マーケティング担当者、研究者、一般市民のどの立場にも対応する

## 回答のルール
1. **必ず日本語で回答する**
2. **データの出典と調査年度を明示する**（例：「2020年国勢調査によると」）
3. **数値は読みやすい単位で表示する**（例：「1,234,567人」→「約123万人」）
4. **データが取得できない場合は代替案を提示する**
5. **coverageMismatch または note が返った場合は、使用したデータレベルを明記する**

## 出力フォーマット
- 比較や一覧にはMarkdownのテーブルを使う
- 手順や重要ポイントはリストを使う
- 見出しは##（H2）以下を使い、長い回答は構造化する
- 短い質問には短く答える（過剰に長くしない）

## エリアコンテキスト
${areaContext}`
}
```

---

### Step 7-3: Run test

Run: `npx vitest run src/lib/llm/prompts.test.ts`
Expected: PASS

---

### Step 7-4: Write failing test for AgentModeSelector

Create `src/components/chat/AgentModeSelector.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AgentModeSelector } from './AgentModeSelector'

describe('AgentModeSelector', () => {
  it('現在のモードが表示される', () => {
    render(<AgentModeSelector mode="default" onModeChange={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('マーケティングモードに切り替えるとonModeChangeが呼ばれる', () => {
    const onModeChange = vi.fn()
    render(<AgentModeSelector mode="default" onModeChange={onModeChange} />)
    // Open dropdown
    fireEvent.click(screen.getByRole('button'))
    // Click marketing option
    fireEvent.click(screen.getByText(/マーケティング/))
    expect(onModeChange).toHaveBeenCalledWith('marketing')
  })
})
```

Run: `npx vitest run src/components/chat/AgentModeSelector.test.tsx`
Expected: FAIL

---

### Step 7-5: Create AgentModeSelector

Create `src/components/chat/AgentModeSelector.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Bot, ChevronDown } from 'lucide-react'
import type { AgentMode } from '@/lib/llm/prompts'

const MODE_LABELS: Record<AgentMode, string> = {
  default: 'デフォルト',
  marketing: 'マーケティング担当',
}

interface AgentModeSelectorProps {
  mode: AgentMode
  onModeChange: (mode: AgentMode) => void
}

export function AgentModeSelector({ mode, onModeChange }: AgentModeSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bot className="h-3.5 w-3.5" />
        {MODE_LABELS[mode]}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-full left-0 z-20 mb-1 min-w-[160px] rounded-lg border border-border bg-background shadow-md">
            {(Object.entries(MODE_LABELS) as [AgentMode, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => { onModeChange(value); setOpen(false) }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-muted ${
                  mode === value ? 'font-medium text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

---

### Step 7-6: Update chat route to accept agentMode

In `src/app/api/chat/route.ts`:

```ts
import { getSystemPrompt, type AgentMode } from '@/lib/llm/prompts'

export async function POST(req: Request) {
  const { messages, selectedAreas, agentMode = 'default' } = (await req.json()) as {
    messages: UIMessage[]
    selectedAreas?: SelectedArea[]
    agentMode?: AgentMode
  }

  // ... areaContext as before ...

  const systemPrompt = getSystemPrompt(agentMode, areaContext)

  // Remove inline systemPrompt string (now comes from prompts.ts)
  const result = streamText({
    model: getLLMModel(),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
```

---

### Step 7-7: Update ChatPanel to manage agentMode

In `src/components/chat/ChatPanel.tsx`:

```ts
const [agentMode, setAgentMode] = useState<AgentMode>('default')
```

Update transport body:
```ts
body: () => ({ selectedAreas: selectedAreasRef.current, agentMode: agentModeRef.current }),
```

Add `agentModeRef`:
```ts
const agentModeRef = useRef(agentMode)
agentModeRef.current = agentMode
```

Pass to ChatInput:
```tsx
<ChatInput
  // ...
  agentMode={agentMode}
  onAgentModeChange={setAgentMode}
/>
```

---

### Step 7-8: Add AgentModeSelector to ChatInput

In `src/components/chat/ChatInput.tsx`:

Add props:
```ts
agentMode: AgentMode
onAgentModeChange: (mode: AgentMode) => void
```

Add before the `<form>` tag or inside the input area:
```tsx
<div className="mb-2 flex items-center gap-2">
  <AgentModeSelector mode={agentMode} onModeChange={onAgentModeChange} />
</div>
```

---

### Step 7-9: Run all tests

Run: `npx vitest run`
Expected: All tests PASS

---

### Step 7-10: Commit

```bash
git add src/lib/llm/prompts.ts src/lib/llm/prompts.test.ts src/components/chat/AgentModeSelector.tsx src/components/chat/AgentModeSelector.test.tsx src/components/chat/ChatPanel.tsx src/components/chat/ChatInput.tsx src/app/api/chat/route.ts
git commit -m "feat: F7 - add marketing agent mode with specialized system prompt"
```

---

## Task 8: F8 — 特化エージェント（スライド作成）

Add a slide-creation mode. The LLM outputs Marp-format Markdown (slides separated by `---`). The frontend detects this format and shows a slide preview with navigation.

**Files:**
- Modify: `src/lib/llm/prompts.ts` (add `slides` mode)
- Modify: `src/components/chat/AgentModeSelector.tsx` (add slides option)
- Modify: `src/components/chat/MessageList.tsx` (detect + render Marp preview)
- Modify: `src/lib/llm/prompts.test.ts` (add slide mode test)

---

### Step 8-1: Add slide mode to prompts

In `src/lib/llm/prompts.ts`:

Update `AgentMode`:
```ts
export type AgentMode = 'default' | 'marketing' | 'slides'
```

Add `slides` to `MODE_LABELS` in `AgentModeSelector.tsx`:
```ts
slides: 'スライド作成',
```

Add slide mode prompt in `getSystemPrompt`:
```ts
if (mode === 'slides') {
  return `あなたは「ChatJapan」のスライド作成エージェントです。
統計データを使って、プレゼンテーション用のスライドをMarp形式のMarkdownで作成します。

## あなたの役割
- ユーザーの質問に対して、発表用スライドを自動生成する
- e-Statの統計データをスライドの内容として活用する

## 出力フォーマット（厳守）
- 必ずMarp形式のMarkdownで出力する
- スライドの区切りは「---」（3つのハイフン）を使う
- 全体をコードブロック（\`\`\`markdown）で囲む
- 1スライドあたり箇条書き3〜5項目を目安にする
- 最初のスライドはタイトルスライド
- データ引用時は出典（調査名・年）を記載する

## 出力例
\`\`\`markdown
# エリア名 市場分析

---

## 人口動態

- 総人口: XX万人（2020年国勢調査）
- 年齢中央値: XX歳

---

## まとめ

- ポイント1
- ポイント2
\`\`\`

## エリアコンテキスト
${areaContext}`
}
```

---

### Step 8-2: Add slide renderer to MessageList

In `src/components/chat/MessageList.tsx`:

Add helper to detect and parse Marp blocks:
```ts
function parseMarpSlides(text: string): string[] | null {
  const match = text.match(/```markdown\n([\s\S]+?)\n```/)
  if (!match) return null
  return match[1].split(/\n---\n/).map((s) => s.trim())
}
```

Add `SlidePreview` component:
```tsx
function SlidePreview({ slides }: { slides: string[] }) {
  const [current, setCurrent] = useState(0)
  const total = slides.length

  return (
    <div className="w-full max-w-[85%] rounded-2xl border border-border overflow-hidden">
      <div className="bg-muted/40 px-4 py-6 min-h-[160px] prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{slides[current]}</ReactMarkdown>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => setCurrent((c) => c - 1)}
          className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
        >
          ← 前へ
        </button>
        <span>{current + 1} / {total}</span>
        <button
          type="button"
          disabled={current === total - 1}
          onClick={() => setCurrent((c) => c + 1)}
          className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
        >
          次へ →
        </button>
      </div>
    </div>
  )
}
```

In `AssistantMessage`, detect slide format:
```tsx
function AssistantMessage({ text }: { text: string }) {
  const slides = parseMarpSlides(text)
  // ... existing copy/feedback state ...

  return (
    <div className="group relative max-w-[85%]">
      {slides ? (
        <SlidePreview slides={slides} />
      ) : (
        <div className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-muted/80 text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}
      {/* copy/feedback buttons unchanged */}
    </div>
  )
}
```

---

### Step 8-3: Add tests for slide parsing

Add to `src/components/chat/MessageList.test.tsx`:

```tsx
it('Marpスライドを検出するとスライドナビゲーションが表示される', () => {
  const marpText = '```markdown\n# タイトル\n\n---\n\n## スライド2\n\n- 項目\n```'
  render(<MessageList messages={[makeMessage('assistant', marpText)]} />)
  expect(screen.getByText('1 / 2')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /次へ/ })).toBeInTheDocument()
})

it('通常のmarkdownはスライドとして表示されない', () => {
  render(<MessageList messages={[makeMessage('assistant', '**普通のテキスト**')]} />)
  expect(screen.queryByText(/\/ 2/)).toBeNull()
})
```

Run: `npx vitest run src/components/chat/MessageList.test.tsx`
Expected: All tests PASS

---

### Step 8-4: Run all tests

Run: `npx vitest run`
Expected: All tests PASS

---

### Step 8-5: Commit

```bash
git add src/lib/llm/prompts.ts src/lib/llm/prompts.test.ts src/components/chat/AgentModeSelector.tsx src/components/chat/MessageList.tsx src/components/chat/MessageList.test.tsx
git commit -m "feat: F8 - add slide creation mode with Marp preview"
```

---

## Execution Order Summary

```
Task 1 (BUG-1): Map close resets chat  ← fix first, high impact
Task 2 (UX-1):  Loading spinner
Task 3 (UX-2):  Tool call display
Task 4 (F4):    Area add via chat
Task 5 (F5):    Multi-area selection   ← big change, affects many files
Task 6 (F6):    Onboarding modal       ← independent, can be done anytime
Task 7 (F7):    Marketing agent
Task 8 (F8):    Slides agent
```

Tasks 1–4 have no inter-dependencies. Task 5 changes the `SelectedArea` API (single→array), which affects F4 (addArea), so F5 should be done after F4. Tasks 7–8 build on each other.
