import { describe, it, expect } from 'vitest'
import { createStatisticsTools } from './tools'
import { STATISTICS_CATEGORIES } from '@/lib/estat/categories'

describe('createStatisticsTools', () => {
  it('returns listStatisticsCategories tool', () => {
    const tools = createStatisticsTools('test-key')
    expect(tools.listStatisticsCategories).toBeDefined()
  })

  it('returns fetchStatistics tool', () => {
    const tools = createStatisticsTools('test-key')
    expect(tools.fetchStatistics).toBeDefined()
  })

  it('returns searchStatsList tool', () => {
    const tools = createStatisticsTools('test-key')
    expect(tools.searchStatsList).toBeDefined()
  })

  it('returns fetchStatsByStatsId tool', () => {
    const tools = createStatisticsTools('test-key')
    expect(tools.fetchStatsByStatsId).toBeDefined()
  })

  it('returns getAreaInfo tool', () => {
    const tools = createStatisticsTools('test-key')
    expect(tools.getAreaInfo).toBeDefined()
  })

  it('listStatisticsCategories returns all categories', async () => {
    const tools = createStatisticsTools('test-key')
    const result = await tools.listStatisticsCategories.execute({}, { messages: [], toolCallId: 'test' })
    expect(result.categories).toHaveLength(STATISTICS_CATEGORIES.length)
    expect(result.categories[0]).toHaveProperty('id')
    expect(result.categories[0]).toHaveProperty('description')
  })

  it('getAreaInfo returns area info with note', async () => {
    const tools = createStatisticsTools('test-key')
    const result = await tools.getAreaInfo.execute(
      { areaCode: '13000', areaName: '東京都' },
      { messages: [], toolCallId: 'test' }
    )
    expect(result.areaCode).toBe('13000')
    expect(result.areaName).toBe('東京都')
    expect(result.note).toBeDefined()
  })
})
