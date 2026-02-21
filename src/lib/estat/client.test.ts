import { describe, it, expect, beforeEach } from 'vitest'
import { EStatClient } from './client'

describe('EStatClient', () => {
  let client: EStatClient

  beforeEach(() => {
    client = new EStatClient('test-api-key')
  })

  it('constructs correct URL for getStatsData', () => {
    const url = client.buildStatsDataUrl('0003410379', '13113')
    expect(url).toContain('appId=test-api-key')
    expect(url).toContain('statsDataId=0003410379')
    expect(url).toContain('cdArea=13113')
  })

  it('includes metaGetFlg=Y by default', () => {
    const url = client.buildStatsDataUrl('0003410379', '13000')
    expect(url).toContain('metaGetFlg=Y')
  })

  it('throws error if API key is not set', () => {
    expect(() => new EStatClient('')).toThrow('e-Stat API key is required')
  })

  describe('normalizeAreaCode', () => {
    it('converts prefecture 2-digit code to 5-digit with trailing 000', () => {
      expect(EStatClient.normalizeAreaCode('13', 'prefecture')).toBe('13000')
    })

    it('pads single-digit prefecture code to 2 digits then adds 000', () => {
      expect(EStatClient.normalizeAreaCode('1', 'prefecture')).toBe('01000')
    })

    it('pads municipality code to 5 digits with leading zeros', () => {
      expect(EStatClient.normalizeAreaCode('1310', 'municipality')).toBe('01310')
    })

    it('leaves already-5-digit municipality code unchanged', () => {
      expect(EStatClient.normalizeAreaCode('13113', 'municipality')).toBe('13113')
    })
  })

  describe('buildClassMap', () => {
    it('builds map from single CLASS_OBJ', () => {
      const classInf = {
        CLASS_OBJ: {
          '@id': 'area',
          '@name': '地域',
          CLASS: [
            { '@code': '13000', '@name': '東京都' },
            { '@code': '27000', '@name': '大阪府' },
          ],
        },
      }
      const map = EStatClient.buildClassMap(classInf)
      expect(map['area']['13000']).toBe('東京都')
      expect(map['area']['27000']).toBe('大阪府')
    })

    it('builds map from multiple CLASS_OBJ', () => {
      const classInf = {
        CLASS_OBJ: [
          {
            '@id': 'area',
            '@name': '地域',
            CLASS: { '@code': '13000', '@name': '東京都' },
          },
          {
            '@id': 'cat01',
            '@name': '男女別',
            CLASS: [
              { '@code': '001', '@name': '総数' },
              { '@code': '002', '@name': '男' },
              { '@code': '003', '@name': '女' },
            ],
          },
        ],
      }
      const map = EStatClient.buildClassMap(classInf)
      expect(map['area']['13000']).toBe('東京都')
      expect(map['cat01']['001']).toBe('総数')
      expect(map['cat01']['003']).toBe('女')
    })
  })
})
