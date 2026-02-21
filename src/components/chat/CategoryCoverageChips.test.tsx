import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CategoryCoverageChips } from './CategoryCoverageChips'

describe('CategoryCoverageChips', () => {
  it('renders coverage badge labels', () => {
    render(
      <CategoryCoverageChips
        categories={[
          { id: 'population', name: '人口統計', coverage: 'municipality' },
          { id: 'commerce', name: '商業統計', coverage: 'prefecture' },
          { id: 'economy', name: '経済センサス', coverage: 'mixed' },
        ]}
      />
    )

    expect(screen.getByText('市区町村')).toBeInTheDocument()
    expect(screen.getByText('都道府県')).toBeInTheDocument()
    expect(screen.getByText('混在')).toBeInTheDocument()
  })
})
