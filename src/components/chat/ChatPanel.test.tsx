import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatPanel } from './ChatPanel'

const { setMessagesMock } = vi.hoisted(() => ({
  setMessagesMock: vi.fn(),
}))

vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn().mockReturnValue({
    messages: [],
    setMessages: setMessagesMock,
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
    setMessagesMock.mockReset()
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

  it('renders map toggle button and calls callback', () => {
    const onToggleMap = vi.fn()
    render(<ChatPanel {...defaultProps} onToggleMap={onToggleMap} isMapOpen={false} />)
    fireEvent.click(screen.getByRole('button', { name: /地図を開く/ }))
    expect(onToggleMap).toHaveBeenCalledTimes(1)
  })

  it('loads messages when session is selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ categories: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            session: {
              messages: [{ id: 'm1', role: 'user', content: 'こんにちは' }],
            },
          }),
        })
    )

    render(<ChatPanel {...defaultProps} sessionId="s1" />)

    await waitFor(() =>
      expect(setMessagesMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'm1',
            role: 'user',
          }),
        ])
      )
    )
  })
})
