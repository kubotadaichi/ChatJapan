import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MobileLayout } from './MobileLayout'

describe('MobileLayout', () => {
  it('shows left panel and hides right when activeTab is map', () => {
    render(
      <MobileLayout
        left={<div data-testid="left">Map</div>}
        right={<div data-testid="right">Chat</div>}
        activeTab="map"
        onTabChange={vi.fn()}
      />
    )
    const leftWrapper = screen.getByTestId('left').parentElement!
    const rightWrapper = screen.getByTestId('right').parentElement!
    expect(leftWrapper.className).not.toContain('invisible')
    expect(rightWrapper.className).toContain('invisible')
  })

  it('shows right panel and hides left when activeTab is chat', () => {
    render(
      <MobileLayout
        left={<div data-testid="left">Map</div>}
        right={<div data-testid="right">Chat</div>}
        activeTab="chat"
        onTabChange={vi.fn()}
      />
    )
    const leftWrapper = screen.getByTestId('left').parentElement!
    const rightWrapper = screen.getByTestId('right').parentElement!
    expect(leftWrapper.className).toContain('invisible')
    expect(rightWrapper.className).not.toContain('invisible')
  })

  it('both panels remain in DOM regardless of activeTab', () => {
    render(
      <MobileLayout
        left={<div data-testid="left">Map</div>}
        right={<div data-testid="right">Chat</div>}
        activeTab="map"
        onTabChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('left')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('renders MobileTabBar', () => {
    render(
      <MobileLayout
        left={<div>Map</div>}
        right={<div>Chat</div>}
        activeTab="map"
        onTabChange={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '地図' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'チャット' })).toBeInTheDocument()
  })

  it('calls onTabChange when tab clicked', async () => {
    const onTabChange = vi.fn()
    render(
      <MobileLayout
        left={<div>Map</div>}
        right={<div>Chat</div>}
        activeTab="map"
        onTabChange={onTabChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'チャット' }))
    expect(onTabChange).toHaveBeenCalledWith('chat')
  })
})
