import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatPanel } from './ChatPanel'

vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn().mockReturnValue({
    messages: [],
    setMessages: vi.fn(),
    sendMessage: vi.fn(),
    status: 'ready',
  }),
}))

describe('ChatPanel', () => {
  const defaultProps = {
    selectedArea: null,
    onAreaClear: vi.fn(),
    sessionId: null,
    onSessionCreated: vi.fn(),
    onTitleGenerated: vi.fn(),
  }

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ categories: [] }),
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders chat input', () => {
    render(<ChatPanel {...defaultProps} />)
    expect(screen.getByPlaceholderText(/メッセージを入力/)).toBeInTheDocument()
  })

  it('renders send button', () => {
    render(<ChatPanel {...defaultProps} />)
    expect(screen.getByRole('button', { name: /送信/ })).toBeInTheDocument()
  })

  it('shows selected area context when area is selected', () => {
    render(
      <ChatPanel
        {...defaultProps}
        selectedArea={{ name: '渋谷区', code: '13113', prefCode: '13', level: 'municipality' }}
      />
    )
    expect(screen.getByText(/渋谷区/)).toBeInTheDocument()
  })

  it('shows placeholder message when no messages', () => {
    render(<ChatPanel {...defaultProps} />)
    expect(screen.getByText(/地図でエリアを選択/)).toBeInTheDocument()
  })
})
