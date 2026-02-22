import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AgentModeSelector } from './AgentModeSelector'

describe('AgentModeSelector', () => {
  it('現在のモードが表示される', () => {
    render(<AgentModeSelector mode="default" onModeChange={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('マーケティングモードに切り替えるとonModeChangeが呼ばれる', () => {
    const onModeChange = vi.fn()
    render(<AgentModeSelector mode="default" onModeChange={onModeChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText(/マーケティング/))
    expect(onModeChange).toHaveBeenCalledWith('marketing')
  })

  it('スライド作成モードが選択できる', () => {
    const onModeChange = vi.fn()
    render(<AgentModeSelector mode="default" onModeChange={onModeChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText(/スライド作成/))
    expect(onModeChange).toHaveBeenCalledWith('slides')
  })
})
