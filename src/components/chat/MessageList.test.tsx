import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UIMessage } from 'ai'
import { MessageList } from './MessageList'

function makeMessage(role: 'user' | 'assistant', text: string): UIMessage {
  return {
    id: '1',
    role,
    parts: [{ type: 'text', text }],
  } as UIMessage
}

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

describe('MessageList', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('AIメッセージの**bold**をstrong要素でレンダリングする', () => {
    render(<MessageList messages={[makeMessage('assistant', '**太字テスト**')]} />)
    const strong = document.querySelector('strong')
    expect(strong).toBeTruthy()
    expect(strong?.textContent).toBe('太字テスト')
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

  it('ローディング中にスピナーが表示される', () => {
    render(<MessageList messages={[makeMessage('user', '質問')]} isLoading={true} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('ローディング中でなければスピナーは表示されない', () => {
    render(<MessageList messages={[makeMessage('user', '質問')]} isLoading={false} />)
    expect(screen.queryByRole('status')).toBeNull()
  })

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

  it('Marpスライドを検出するとスライドナビゲーションが表示される', () => {
    const marpText = `\`\`\`markdown
# タイトル

---

## スライド2

- 項目
\`\`\``
    render(<MessageList messages={[makeMessage('assistant', marpText)]} />)
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /次へ/ })).toBeInTheDocument()
  })

  it('通常のmarkdownはスライドとして表示されない', () => {
    render(<MessageList messages={[makeMessage('assistant', '**普通のテキスト**')]} />)
    expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull()
  })

  it('同一IDメッセージが含まれても重複key警告を出さない', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const duplicatedIdMessages: UIMessage[] = [
      { ...makeMessage('user', 'A'), id: 'dup-id' },
      { ...makeMessage('assistant', 'B'), id: 'dup-id' },
    ]

    render(<MessageList messages={duplicatedIdMessages} />)

    const duplicateKeyWarn = errorSpy.mock.calls.some((call) =>
      String(call[0]).includes('Encountered two children with the same key')
    )
    expect(duplicateKeyWarn).toBe(false)
    errorSpy.mockRestore()
  })
})

describe('MessageList フィードバック', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('AIメッセージにコピーボタンがある', () => {
    render(<MessageList messages={[makeMessage('assistant', 'AIの回答')]} />)
    expect(screen.getByRole('button', { name: /コピー/ })).toBeInTheDocument()
  })

  it('コピーボタンクリックでclipboardにテキストが書き込まれる', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<MessageList messages={[makeMessage('assistant', 'コピーするテキスト')]} />)
    fireEvent.click(screen.getByRole('button', { name: /コピー/ }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('コピーするテキスト')
    })
  })

  it('ユーザーメッセージにはコピーボタンがない', () => {
    render(<MessageList messages={[makeMessage('user', 'ユーザーの入力')]} />)
    expect(screen.queryByRole('button', { name: /コピー/ })).toBeNull()
  })
})
