import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionSidebar } from './SessionSidebar'

const mockSessions = [
  { id: 's1', title: '渋谷区の人口', areaName: '渋谷区', createdAt: new Date('2026-02-21') },
  { id: 's2', title: null, areaName: '新宿区', createdAt: new Date('2026-02-20') },
]

describe('SessionSidebar', () => {
  it('renders session list', () => {
    render(
      <SessionSidebar
        sessions={mockSessions}
        currentSessionId={null}
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
      />
    )
    expect(screen.getByText('渋谷区の人口')).toBeInTheDocument()
    expect(screen.getByText('新宿区')).toBeInTheDocument()
  })

  it('calls onNewSession when new button is clicked', () => {
    const onNew = vi.fn()
    render(
      <SessionSidebar
        sessions={[]}
        currentSessionId={null}
        onNewSession={onNew}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /新しい会話/ }))
    expect(onNew).toHaveBeenCalled()
  })

  it('highlights current session', () => {
    render(
      <SessionSidebar
        sessions={mockSessions}
        currentSessionId="s1"
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
      />
    )
    const s1 = screen.getByText('渋谷区の人口').closest('button')
    expect(s1?.className).toContain('bg-')
  })

  it('calls onSelectSession when a session is clicked', () => {
    const onSelect = vi.fn()
    render(
      <SessionSidebar
        sessions={mockSessions}
        currentSessionId={null}
        onNewSession={vi.fn()}
        onSelectSession={onSelect}
        onDeleteSession={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('渋谷区の人口'))
    expect(onSelect).toHaveBeenCalledWith('s1')
  })
})
