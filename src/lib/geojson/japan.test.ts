import { describe, it, expect } from 'vitest'
import { extractAreaFromFeature } from './japan'

describe('extractAreaFromFeature', () => {
  it('extracts prefecture area from GeoJSON feature', () => {
    const feature = {
      properties: {
        N03_001: '東京都',
        N03_007: '13000',
      },
    }
    const area = extractAreaFromFeature(feature as unknown as GeoJSON.Feature, 'prefecture')
    expect(area?.name).toBe('東京都')
    expect(area?.prefCode).toBe('13')
    expect(area?.level).toBe('prefecture')
  })

  it('extracts municipality area from GeoJSON feature', () => {
    const feature = {
      properties: {
        N03_004: '渋谷区',
        N03_007: '13113',
      },
    }
    const area = extractAreaFromFeature(feature as unknown as GeoJSON.Feature, 'municipality')
    expect(area?.name).toBe('渋谷区')
    expect(area?.code).toBe('13113')
    expect(area?.prefCode).toBe('13')
    expect(area?.level).toBe('municipality')
  })

  it('extracts prefecture area from dataofjapan/land format', () => {
    const feature = {
      properties: { nam: 'Tokyo To', nam_ja: '東京都', id: 13 },
    }
    const area = extractAreaFromFeature(feature as unknown as GeoJSON.Feature, 'prefecture')
    expect(area?.name).toBe('東京都')
    expect(area?.code).toBe('13')
    expect(area?.prefCode).toBe('13')
    expect(area?.level).toBe('prefecture')
  })

  it('returns null for feature without required properties', () => {
    const feature = { properties: {} }
    const area = extractAreaFromFeature(feature as unknown as GeoJSON.Feature, 'prefecture')
    expect(area).toBeNull()
  })
})
