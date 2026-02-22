import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThreeColumnLayout } from './ThreeColumnLayout'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { useState } from 'react'

vi.mock('react-resizable-panels', () => ({
  Group: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Separator: () => <div />,
}))

describe('ThreeColumnLayout', () => {
  function Stateful() {
    const [n, setN] = useState(0)
    return (
      <button onClick={() => setN((c) => c + 1)} data-testid="counter">
        {n}
      </button>
    )
  }

  it('renders all three panels', () => {
    render(
      <ThreeColumnLayout
        sidebar={<div data-testid="sidebar">sidebar</div>}
        center={<div data-testid="center">center</div>}
        right={<div data-testid="right">right</div>}
      />
    )
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('center')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('renders without sidebar (2-column mode)', () => {
    render(
      <ThreeColumnLayout
        center={<div data-testid="center">center</div>}
        right={<div data-testid="right">right</div>}
      />
    )
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
    expect(screen.getByTestId('center')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('renders sidebar and right when center is omitted', () => {
    render(
      <ThreeColumnLayout
        sidebar={<div data-testid="sidebar">sidebar</div>}
        right={<div data-testid="right">right</div>}
      />
    )
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.queryByTestId('center')).not.toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('right content is not remounted when center prop changes', () => {
    const { rerender } = render(<ThreeColumnLayout right={<Stateful />} />)

    act(() => screen.getByTestId('counter').click())
    expect(screen.getByTestId('counter').textContent).toBe('1')

    rerender(<ThreeColumnLayout center={<div>map</div>} right={<Stateful />} />)
    expect(screen.getByTestId('counter').textContent).toBe('1')

    rerender(<ThreeColumnLayout right={<Stateful />} />)
    expect(screen.getByTestId('counter').textContent).toBe('1')
  })
})
