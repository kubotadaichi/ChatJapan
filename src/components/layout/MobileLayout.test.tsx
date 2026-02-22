import { act, render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MobileLayout } from './MobileLayout'
import { useState } from 'react'

describe('MobileLayout', () => {
  function Stateful() {
    const [n, setN] = useState(0)
    return (
      <button onClick={() => setN((c) => c + 1)} data-testid="counter">
        {n}
      </button>
    )
  }

  it('renders only chat area when map is closed', () => {
    render(
      <MobileLayout
        sidebar={null}
        map={<div data-testid="map">Map</div>}
        chat={<div data-testid="chat">Chat</div>}
        isMapOpen={false}
      />
    )

    expect(screen.getByTestId('chat')).toBeInTheDocument()
    const mapWrapper = screen.getByTestId('map').parentElement
    expect(mapWrapper?.className).toContain('hidden')
  })

  it('renders map and chat stacked vertically when map is open', () => {
    render(
      <MobileLayout
        sidebar={null}
        map={<div data-testid="map">Map</div>}
        chat={<div data-testid="chat">Chat</div>}
        isMapOpen={true}
      />
    )

    const mapWrapper = screen.getByTestId('map').parentElement
    const chatWrapper = screen.getByTestId('chat').parentElement

    expect(mapWrapper?.className).toContain('h-[45%]')
    expect(chatWrapper?.className).toContain('flex-1')
  })

  it('renders sidebar region when sidebar is provided', () => {
    render(
      <MobileLayout
        sidebar={<div data-testid="mobile-sidebar">Sidebar</div>}
        map={<div>Map</div>}
        chat={<div>Chat</div>}
        isMapOpen={false}
      />
    )

    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument()
  })

  it('chat is not remounted when isMapOpen toggles', () => {
    const { rerender } = render(<MobileLayout chat={<Stateful />} isMapOpen={false} />)

    act(() => screen.getByTestId('counter').click())
    expect(screen.getByTestId('counter').textContent).toBe('1')

    rerender(<MobileLayout map={<div>map</div>} chat={<Stateful />} isMapOpen={true} />)
    expect(screen.getByTestId('counter').textContent).toBe('1')

    rerender(<MobileLayout chat={<Stateful />} isMapOpen={false} />)
    expect(screen.getByTestId('counter').textContent).toBe('1')
  })
})
