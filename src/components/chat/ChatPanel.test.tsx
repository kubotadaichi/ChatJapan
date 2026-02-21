import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
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
})
