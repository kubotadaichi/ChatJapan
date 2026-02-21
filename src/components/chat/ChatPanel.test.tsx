import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { ChatPanel } from './ChatPanel'

vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn().mockReturnValue({
    messages: [],
    sendMessage: vi.fn(),
    status: 'ready',
    setMessages: vi.fn(),
  }),
}))

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          categories: [],
        }),
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders chat input', () => {
    render(<ChatPanel selectedArea={null} onAreaClear={vi.fn()} />)
    expect(screen.getByPlaceholderText(/メッセージを入力/)).toBeInTheDocument()
  })

  it('renders send button', () => {
    render(<ChatPanel selectedArea={null} onAreaClear={vi.fn()} />)
    expect(screen.getByRole('button', { name: /送信/ })).toBeInTheDocument()
  })

  it('shows selected area context near chat input when area is selected', () => {
    render(
      <ChatPanel
        selectedArea={{
          name: '渋谷区',
          code: '13113',
          prefCode: '13',
          level: 'municipality',
        }}
        onAreaClear={vi.fn()}
      />
    )
    const chip = screen.getByTestId('selected-area-chip')
    expect(chip).toHaveTextContent('渋谷区')
    expect(within(screen.getByTestId('chat-panel-header')).queryByText(/渋谷区/)).not.toBeInTheDocument()
  })

  it('shows placeholder message when no messages', () => {
    render(<ChatPanel selectedArea={null} onAreaClear={vi.fn()} />)
    expect(screen.getByText(/地図でエリアを選択/)).toBeInTheDocument()
  })

  it('uses theme token classes in panel header', () => {
    render(<ChatPanel selectedArea={null} onAreaClear={vi.fn()} />)
    const title = screen.getByText('ChatJapan')
    expect(title.closest('div')).toHaveClass('bg-background')
  })

  it('clears selected area when close button is clicked', async () => {
    const user = userEvent.setup()
    const onAreaClear = vi.fn()

    render(
      <ChatPanel
        selectedArea={{
          name: '渋谷区',
          code: '13113',
          prefCode: '13',
          level: 'municipality',
        }}
        onAreaClear={onAreaClear}
      />
    )

    await user.click(screen.getByRole('button', { name: /選択解除/ }))
    expect(onAreaClear).toHaveBeenCalledTimes(1)
  })

  it('toggles categories strip visibility when user switches it on', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          categories: [
            {
              id: 'population',
              name: '人口統計',
              description: '人口関連',
              coverage: 'municipality',
              coverageNote: null,
            },
          ],
        }),
      })
    )

    render(<ChatPanel selectedArea={null} onAreaClear={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /カテゴリ表示/i })).toBeInTheDocument())
    expect(screen.queryByTestId('category-coverage-strip')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /カテゴリ表示/i }))

    const strip = await screen.findByTestId('category-coverage-strip')
    expect(strip).toHaveTextContent('人口統計')
    expect(strip).toHaveTextContent('市区町村')

    await user.click(screen.getByRole('button', { name: /カテゴリ非表示/i }))
    expect(screen.queryByTestId('category-coverage-strip')).not.toBeInTheDocument()
  })

  it('keeps chat input usable when categories API fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'))
    vi.stubGlobal('fetch', fetchMock)

    render(<ChatPanel selectedArea={null} onAreaClear={vi.fn()} />)

    expect(screen.getByPlaceholderText(/メッセージを入力/)).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByTestId('category-coverage-strip')).not.toBeInTheDocument()
  })
})
