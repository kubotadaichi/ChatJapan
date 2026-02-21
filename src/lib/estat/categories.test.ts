import { describe, it, expect } from 'vitest'
import { STATISTICS_CATEGORIES } from './categories'

describe('STATISTICS_CATEGORIES', () => {
  it('has unique category ids', () => {
    const ids = STATISTICS_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('defines coverage for all categories', () => {
    for (const c of STATISTICS_CATEGORIES) {
      expect(['municipality', 'prefecture', 'mixed']).toContain(c.coverage)
    }
  })
})
