# Quick Wins & Features (Q1–Q3, F1–F3) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 6つのタスク（Cmd+Enter送信・ファビコン変更・ログインアイコン化・マークダウンレンダリング・フィードバックボタン・システムプロンプト規定）を実装する。

**Architecture:** 既存の `ChatInput` / `MessageList` / `Header` / `chat/route.ts` を修正する。新ファイルは最小限。各タスクは独立しており、どの順序でも実装できる。

**Tech Stack:** Next.js 16 App Router, TypeScript, React, shadcn/ui, vitest + @testing-library/react, react-markdown, remark-gfm

---

## Task 1: Cmd/Ctrl+Enter で送信（Q1）

**Files:**
- Modify: `src/components/chat/ChatInput.tsx`

### Step 1: 失敗するテストを書く

`src/components/chat/ChatInput.tsx` には既存のテストファイルがない。
`src/components/chat/ChatInput.test.tsx` を新規作成する。

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatInput } from './ChatInput'

const defaultProps = {
  selectedArea: null,
  categories: [],
  onAreaClear: vi.fn(),
  input: 'テスト入力',
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  isLoading: false,
}

describe('ChatInput', () => {
  it('Cmd+Enter で onSubmit が呼ばれる', () => {
    render(<ChatInput {...defaultProps} />)
    const input = screen.getByPlaceholderText(/メッセージを入力/)
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('Ctrl+Enter で onSubmit が呼ばれる', () => {
    render(<ChatInput {...defaultProps} />)
    const input = screen.getByPlaceholderText(/メッセージを入力/)
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('Enter 単体では onSubmit が呼ばれない', () => {
    render(<ChatInput {...defaultProps} />)
    const input = screen.getByPlaceholderText(/メッセージを入力/)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })
})
```

### Step 2: テストが失敗することを確認

```bash
npx vitest run src/components/chat/ChatInput.test.tsx
```

期待: FAIL（`onSubmit` が呼ばれない）

### Step 3: 実装

`src/components/chat/ChatInput.tsx` の `Input` に `onKeyDown` を追加する。

`onSubmit` の型は `(e: FormEvent<HTMLFormElement>) => void` だが、`requestSubmit()` でフォームのsubmitを発火できる。

```tsx
// Input 要素に追加する props:
onKeyDown={(e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.currentTarget.form?.requestSubmit()
  }
}}
```

`Input` 要素（84行目付近）を以下のように修正：

```tsx
<Input
  name="message"
  autoComplete="off"
  value={input}
  onChange={onChange}
  onKeyDown={(e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.currentTarget.form?.requestSubmit()
    }
  }}
  placeholder="メッセージを入力…"
  disabled={isLoading}
  className="flex-1 h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent"
/>
```

### Step 4: テストが通ることを確認

```bash
npx vitest run src/components/chat/ChatInput.test.tsx
```

期待: PASS（3テスト全通過）

### Step 5: コミット

```bash
git add src/components/chat/ChatInput.tsx src/components/chat/ChatInput.test.tsx
git commit -m "feat: submit on Cmd/Ctrl+Enter in chat input"
```

---

## Task 2: ファビコン変更（Q2）

**Files:**
- Replace: `public/favicon.ico`（または `src/app/favicon.ico`）
- Modify: `src/app/layout.tsx`

### Step 1: SVGファビコンを作成する

`public/favicon.svg` を新規作成する。日本地図の赤い丸（日の丸）をモチーフにしたシンプルなSVG：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1a1a2e"/>
  <circle cx="16" cy="16" r="9" fill="#e63946"/>
</svg>
```

### Step 2: layout.tsx の metadata にアイコンを追加

`src/app/layout.tsx` の `metadata` オブジェクトを修正する：

```tsx
export const metadata: Metadata = {
  title: 'ChatJapan',
  description: '日本の統計情報を地図で探索するチャットサービス',
  icons: {
    icon: '/favicon.svg',
  },
}
```

### Step 3: 動作確認

```bash
npm run dev
```

ブラウザのタブでファビコンが変わっていることを目視確認する。

### Step 4: コミット

```bash
git add public/favicon.svg src/app/layout.tsx
git commit -m "feat: update favicon to Japan-themed SVG icon"
```

---

## Task 3: ログイン表示をアイコンに（Q3）

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Header.test.tsx`

### Step 1: shadcn/ui コンポーネントをインストール

```bash
npx shadcn@latest add avatar dropdown-menu
```

`src/components/ui/avatar.tsx` と `src/components/ui/dropdown-menu.tsx` が生成されることを確認。

### Step 2: 失敗するテストを書く

`src/components/layout/Header.test.tsx` に追加：

```tsx
import { useSession } from 'next-auth/react'

// 既存の vi.mock はそのまま残す

it('ログイン中はアバターボタンを表示する', () => {
  vi.mocked(useSession).mockReturnValue({
    data: {
      user: { name: 'テストユーザー', email: 'test@example.com', image: null },
      expires: '',
    },
    status: 'authenticated',
    update: vi.fn(),
  })
  render(<Header />)
  expect(screen.getByRole('button', { name: /アカウントメニュー/ })).toBeInTheDocument()
  expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
})

it('未ログインはログインボタンを表示する', () => {
  vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() })
  render(<Header />)
  expect(screen.getByRole('button', { name: /ログイン/ })).toBeInTheDocument()
})
```

### Step 3: テストが失敗することを確認

```bash
npx vitest run src/components/layout/Header.test.tsx
```

期待: FAIL

### Step 4: Header.tsx を修正

`src/components/layout/Header.tsx` のログイン状態の表示部分を置き換える：

```tsx
'use client'

import { useEffect, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Moon, Sun, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function Header() {
  const { data: session } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = resolvedTheme ?? 'dark'
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
  const showSunIcon = mounted ? currentTheme === 'dark' : true

  return (
    <header className="h-12 border-b border-border/70 flex items-center justify-between px-4 bg-background/90 backdrop-blur shrink-0">
      <span className="font-medium text-sm tracking-tight">ChatJapan</span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="テーマ切替"
          onClick={() => setTheme(nextTheme)}
          className="text-muted-foreground hover:text-foreground"
        >
          {showSunIcon ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {session ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="アカウントメニュー"
                className="rounded-full p-0"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={session.user?.image ?? ''} alt={session.user?.name ?? ''} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                {session.user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => signIn('google')}
          >
            ログイン
          </Button>
        )}
      </div>
    </header>
  )
}
```

### Step 5: テストが通ることを確認

```bash
npx vitest run src/components/layout/Header.test.tsx
```

期待: PASS

### Step 6: コミット

```bash
git add src/components/layout/Header.tsx src/components/layout/Header.test.tsx src/components/ui/avatar.tsx src/components/ui/dropdown-menu.tsx
git commit -m "feat: replace login email text with avatar icon and dropdown menu"
```

---

## Task 4: マークダウンレンダリング（F1）

**Files:**
- Modify: `src/components/chat/MessageList.tsx`

### Step 1: パッケージをインストール

```bash
npm install react-markdown remark-gfm
```

### Step 2: 失敗するテストを書く

`MessageList.tsx` には既存のテストがない。`src/components/chat/MessageList.test.tsx` を新規作成：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MessageList } from './MessageList'
import type { UIMessage } from 'ai'

function makeMessage(role: 'user' | 'assistant', text: string): UIMessage {
  return {
    id: '1',
    role,
    parts: [{ type: 'text', text }],
  } as UIMessage
}

describe('MessageList', () => {
  it('AIメッセージの**bold**をstrong要素でレンダリングする', () => {
    render(<MessageList messages={[makeMessage('assistant', '**太字テスト**')]} />)
    expect(screen.getByRole('strong') ?? document.querySelector('strong')).toBeTruthy()
    expect(document.querySelector('strong')?.textContent).toBe('太字テスト')
  })

  it('AIメッセージの# 見出しをh1でレンダリングする', () => {
    render(<MessageList messages={[makeMessage('assistant', '# 見出しテスト')]} />)
    expect(document.querySelector('h1')?.textContent).toBe('見出しテスト')
  })

  it('ユーザーメッセージはmarkdownをレンダリングしない（プレーンテキスト）', () => {
    render(<MessageList messages={[makeMessage('user', '**太字なし**')]} />)
    expect(document.querySelector('strong')).toBeNull()
    expect(screen.getByText('**太字なし**')).toBeInTheDocument()
  })
})
```

### Step 3: テストが失敗することを確認

```bash
npx vitest run src/components/chat/MessageList.test.tsx
```

期待: FAIL

### Step 4: MessageList.tsx を修正

```tsx
import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UIMessage } from 'ai'

interface MessageListProps {
  messages: UIMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
        <p className="max-w-sm leading-relaxed">
          地図でエリアを選択して、統計情報について質問してみましょう。<br />例: 「この地域の人口構成を教えて」
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 space-y-5">
        {messages.map((message) => {
          const text = message.parts
            .filter((p) => p.type === 'text')
            .map((p) => ('text' in p ? p.text : ''))
            .join('')

          return (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-foreground text-background rounded-br-md whitespace-pre-wrap'
                    : 'bg-muted/80 text-foreground'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none
                    prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1
                    prose-li:my-0 prose-table:text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  text
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
```

**注意:** `prose` クラスを使うには `@tailwindcss/typography` プラグインが必要。
まずインストール確認：

```bash
npm list @tailwindcss/typography
```

インストールされていなければ：

```bash
npm install @tailwindcss/typography
```

`tailwind.config.ts` の `plugins` に追加：

```ts
plugins: [require('@tailwindcss/typography')],
```

### Step 5: テストが通ることを確認

```bash
npx vitest run src/components/chat/MessageList.test.tsx
```

期待: PASS

### Step 6: コミット

```bash
git add src/components/chat/MessageList.tsx src/components/chat/MessageList.test.tsx
git commit -m "feat: render markdown in AI messages using react-markdown"
```

---

## Task 5: 回答フィードバック（F2）

**Files:**
- Modify: `src/components/chat/MessageList.tsx`
- Modify: `src/components/chat/MessageList.test.tsx`

### Step 1: 失敗するテストを書く

`src/components/chat/MessageList.test.tsx` に追加（既存テストの下）：

```tsx
import { fireEvent } from '@testing-library/react'

describe('MessageList フィードバック', () => {
  it('AIメッセージにコピーボタンがある', () => {
    render(<MessageList messages={[makeMessage('assistant', 'AIの回答')]} />)
    expect(screen.getByRole('button', { name: /コピー/ })).toBeInTheDocument()
  })

  it('コピーボタンクリックでclipboardにテキストが書き込まれる', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    render(<MessageList messages={[makeMessage('assistant', 'コピーするテキスト')]} />)
    fireEvent.click(screen.getByRole('button', { name: /コピー/ }))

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('コピーするテキスト')
    })
  })

  it('ユーザーメッセージにはコピーボタンがない', () => {
    render(<MessageList messages={[makeMessage('user', 'ユーザーの入力')]} />)
    expect(screen.queryByRole('button', { name: /コピー/ })).toBeNull()
  })
})
```

### Step 2: テストが失敗することを確認

```bash
npx vitest run src/components/chat/MessageList.test.tsx
```

期待: FAIL（コピーボタンが存在しない）

### Step 3: MessageList.tsx にアクションバーを追加

AIメッセージの `<div>` を `group` クラスを持つラッパーで囲み、ホバー時にアクションバーを表示する。
`MessageList.tsx` の `message.role === 'assistant'` 側を以下のように修正：

```tsx
import { Copy, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'

// メッセージごとのコピー状態管理用に useState を各メッセージに持たせる
// MessageList 内のmapの中でコピー状態を管理するため、
// 各メッセージを個別コンポーネントに切り出す。

// ファイルの先頭付近に追加:
function AssistantMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="group relative max-w-[85%]">
      <div className="bg-muted/80 text-foreground rounded-2xl px-4 py-2.5 text-sm leading-relaxed">
        <div className="prose prose-sm dark:prose-invert max-w-none
          prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1
          prose-li:my-0 prose-table:text-xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          aria-label="コピー"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Copy className="h-3 w-3" />
          {copied ? 'コピー済み' : 'コピー'}
        </button>
        <button
          type="button"
          aria-label="良い回答"
          className="inline-flex items-center rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ThumbsUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label="改善が必要"
          className="inline-flex items-center rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ThumbsDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
```

`MessageList` の `map` 内の `assistant` 側：

```tsx
{message.role === 'assistant' ? (
  <AssistantMessage
    text={message.parts
      .filter((p) => p.type === 'text')
      .map((p) => ('text' in p ? p.text : ''))
      .join('')}
  />
) : (
  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-foreground text-background rounded-br-md whitespace-pre-wrap">
    {text}
  </div>
)}
```

**注意:** `useEffect` と `useRef` は `MessageList` 関数内に残す（`AssistantMessage` は別コンポーネント）。

### Step 4: テストが通ることを確認

```bash
npx vitest run src/components/chat/MessageList.test.tsx
```

期待: PASS

### Step 5: コミット

```bash
git add src/components/chat/MessageList.tsx src/components/chat/MessageList.test.tsx
git commit -m "feat: add copy/feedback action bar to AI messages"
```

---

## Task 6: システムプロンプト規定（F3）

**Files:**
- Modify: `src/app/api/chat/route.ts`

### Step 1: 現在のシステムプロンプトを確認

`src/app/api/chat/route.ts` の `system:` 文字列（40行目付近）を確認する。

### Step 2: システムプロンプトを拡充する

`streamText` の `system` 引数を以下に置き換える：

```typescript
const systemPrompt = `あなたは「ChatJapan」の統計データアナリストです。
日本の政府統計ポータル「e-Stat」のデータを活用して、ユーザーの質問に回答します。

## あなたの役割
- エリアの統計データ（人口・商業・経済など）を分かりやすく解説する
- データに基づいた客観的な分析と洞察を提供する
- マーケティング担当者、研究者、一般市民のどの立場にも対応する

## 回答のルール
1. **必ず日本語で回答する**
2. **データの出典と調査年度を明示する**（例：「2020年国勢調査によると」）
3. **数値は読みやすい単位で表示する**（例：「1,234,567人」→「約123万人」）
4. **データが取得できない場合は代替案を提示する**（例：「市区町村データはありませんが都道府県データで参考値をお示しします」）
5. **coverageMismatch または note が返った場合は、使用したデータレベルを明記する**

## 出力フォーマット
- 比較や一覧にはMarkdownのテーブルを使う
- 手順や重要ポイントはリストを使う
- 見出しは##（H2）以下を使い、長い回答は構造化する
- 短い質問には短く答える（過剰に長くしない）

## エリアコンテキスト
${areaContext}`

const result = streamText({
  model: getLLMModel(),
  system: systemPrompt,
  messages: await convertToModelMessages(messages),
  tools,
  stopWhen: stepCountIs(5),
})
```

**注意:** `areaContext` 変数は既に定義済みなのでそのまま使用する（35行目付近）。

### Step 3: 手動動作確認

```bash
npm run dev
```

ブラウザで以下を試す：
1. エリアを選択して「人口を教えて」と入力 → 調査年度が明記されているか確認
2. 数値の表示が読みやすいか確認
3. テーブル形式が適切に使われているか確認

### Step 4: コミット

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: define detailed system prompt for ChatJapan assistant"
```

---

## 全タスク完了後の確認

```bash
npx vitest run
```

全テストが PASS することを確認する。

```bash
npm run build
```

ビルドエラーがないことを確認する。
