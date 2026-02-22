import { afterEach, describe, it, expect, vi } from 'vitest'
import { createStatisticsTools } from './tools'
import { STATISTICS_CATEGORIES } from '@/lib/estat/categories'

describe('createStatisticsTools', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

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

  it('returns addArea tool', () => {
    const tools = createStatisticsTools('test-key')
    expect(tools.addArea).toBeDefined()
  })

  it('listStatisticsCategories returns all categories', async () => {
    const tools = createStatisticsTools('test-key')
    const result = await tools.listStatisticsCategories.execute({}, { messages: [], toolCallId: 'test' })
    expect(result.categories).toHaveLength(STATISTICS_CATEGORIES.length)
    expect(result.categories[0]).toHaveProperty('id')
    expect(result.categories[0]).toHaveProperty('description')
  })

  it('listStatisticsCategories includes coverage metadata', async () => {
    const tools = createStatisticsTools('test-key')
    const result = await tools.listStatisticsCategories.execute({}, { messages: [], toolCallId: 'test' })
    expect(result.categories[0]).toHaveProperty('coverage')
  })

  it('returns mismatch metadata when municipality request falls back to prefecture', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        GET_STATS_DATA: {
          RESULT: { STATUS: 0, ERROR_MSG: '', DATE: '2026-02-21' },
          STATISTICAL_DATA: {
            RESULT_INF: { FROM_NUMBER: 1, TO_NUMBER: 1, TOTAL_NUMBER: 1 },
            TABLE_INF: {
              '@id': '0003149505',
              TITLE: '商業統計テーブル',
              STATISTICS_NAME: '商業統計',
              SURVEY_DATE: 2020,
            },
            CLASS_INF: {
              CLASS_OBJ: [
                {
                  '@id': 'area',
                  '@name': '地域',
                  CLASS: [{ '@code': '13000', '@name': '東京都' }],
                },
                {
                  '@id': 'time',
                  '@name': '時点',
                  CLASS: [{ '@code': '2020', '@name': '2020年' }],
                },
              ],
            },
            DATA_INF: {
              VALUE: [{ '@area': '13000', '@time': '2020', '$': '100' }],
            },
          },
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const tools = createStatisticsTools('test-key')
    const result = await tools.fetchStatistics.execute(
      {
        categoryId: 'commerce',
        areaCode: '13113',
        prefCode: '13',
      },
      { messages: [], toolCallId: 'test' }
    )

    expect(result.coverageMismatch).toBe(true)
    expect(result.requestedDataLevel).toBe('municipality')
    expect(result.resolvedDataLevel).toBe('prefecture')
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

  it('addArea ツールが area 情報を返す', async () => {
    const tools = createStatisticsTools('dummy-key')
    const result = await tools.addArea.execute(
      {
        name: '渋谷区',
        code: '13113',
        prefCode: '13',
        level: 'municipality',
      },
      { messages: [], toolCallId: 'test' }
    )

    expect(result).toEqual({
      name: '渋谷区',
      code: '13113',
      prefCode: '13',
      level: 'municipality',
    })
  })
})
