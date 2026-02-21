import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('GET /api/statistics/categories', () => {
  it('returns categories with coverage fields', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.categories)).toBe(true)
    expect(body.categories[0]).toHaveProperty('id')
    expect(body.categories[0]).toHaveProperty('coverage')
  })
})
