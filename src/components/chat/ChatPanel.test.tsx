import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatPanel } from './ChatPanel'

vi.mock('ai/react', () => ({
  useChat: vi.fn().mockReturnValue({
    messages: [],
    input: '',
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
  }),
}))

describe('ChatPanel', () => {
  it('renders chat input', () => {
    render(<ChatPanel selectedArea={null} />)
    expect(screen.getByPlaceholderText(/メッセージを入力/)).toBeInTheDocument()
  })

  it('renders send button', () => {
    render(<ChatPanel selectedArea={null} />)
    expect(screen.getByRole('button', { name: /送信/ })).toBeInTheDocument()
  })

  it('shows selected area context when area is selected', () => {
    render(
      <ChatPanel
        selectedArea={{
          name: '渋谷区',
          code: '13113',
          prefCode: '13',
          level: 'municipality',
        }}
      />
    )
    expect(screen.getByText(/渋谷区/)).toBeInTheDocument()
  })

  it('shows placeholder message when no messages', () => {
    render(<ChatPanel selectedArea={null} />)
    expect(screen.getByText(/地図でエリアを選択/)).toBeInTheDocument()
  })
})
