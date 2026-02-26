import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatInput } from './ChatInput'

vi.mock('./SkillPicker', () => ({
  SkillPicker: () => <div data-testid="skill-picker" />,
}))

function createProps() {
  return {
    selectedAreas: [],
    onAreaClear: vi.fn(),
    onAreaRemove: vi.fn(),
    input: 'テスト入力',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
    skillSelection: { type: 'auto' } as const,
    onSkillSelectionChange: vi.fn(),
    autoSelectedSkill: null,
    onClearAutoSelected: vi.fn(),
  }
}

describe('ChatInput', () => {
  it('Cmd+Enter で onSubmit が呼ばれる', () => {
    const props = createProps()
    render(<ChatInput {...props} />)
    const input = screen.getByPlaceholderText(/メッセージを入力/)
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('Ctrl+Enter で onSubmit が呼ばれる', () => {
    const props = createProps()
    render(<ChatInput {...props} />)
    const input = screen.getByPlaceholderText(/メッセージを入力/)
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('Enter 単体では onSubmit が呼ばれない', () => {
    const props = createProps()
    render(<ChatInput {...props} />)
    const input = screen.getByPlaceholderText(/メッセージを入力/)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(props.onSubmit).not.toHaveBeenCalled()
  })
})
