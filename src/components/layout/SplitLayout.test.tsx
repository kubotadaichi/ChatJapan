import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SplitLayout } from './SplitLayout'

describe('SplitLayout', () => {
  it('renders left and right panels', () => {
    render(
      <SplitLayout
        left={<div data-testid="left">Left</div>}
        right={<div data-testid="right">Right</div>}
      />
    )
    expect(screen.getByTestId('left')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('applies correct layout classes', () => {
    const { container } = render(
      <SplitLayout left={<div />} right={<div />} />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('flex')
  })
})
