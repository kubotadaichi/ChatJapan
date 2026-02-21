import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MobileLayout } from './MobileLayout'

describe('MobileLayout', () => {
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
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
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
})
