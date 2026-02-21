import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MobileTabBar } from './MobileTabBar'

describe('MobileTabBar', () => {
  it('renders map and chat tab buttons', () => {
    render(<MobileTabBar activeTab="map" onTabChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '地図' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'チャット' })).toBeInTheDocument()
  })

  it('calls onTabChange with "map" when map tab clicked', async () => {
    const onTabChange = vi.fn()
    render(<MobileTabBar activeTab="chat" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByRole('button', { name: '地図' }))
    expect(onTabChange).toHaveBeenCalledWith('map')
  })

  it('calls onTabChange with "chat" when chat tab clicked', async () => {
    const onTabChange = vi.fn()
    render(<MobileTabBar activeTab="map" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'チャット' }))
    expect(onTabChange).toHaveBeenCalledWith('chat')
  })

  it('applies active style to map tab when activeTab is map', () => {
    render(<MobileTabBar activeTab="map" onTabChange={vi.fn()} />)
    const mapBtn = screen.getByRole('button', { name: '地図' })
    expect(mapBtn.className).toContain('text-foreground')
  })

  it('applies muted style to chat tab when activeTab is map', () => {
    render(<MobileTabBar activeTab="map" onTabChange={vi.fn()} />)
    const chatBtn = screen.getByRole('button', { name: 'チャット' })
    expect(chatBtn.className).toContain('text-muted-foreground')
  })
})
