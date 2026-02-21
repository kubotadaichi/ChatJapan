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

  it('throws error if API key is not set', () => {
    expect(() => new EStatClient('')).toThrow('e-Stat API key is required')
  })

  it('normalizeAreaCode pads municipality code to 5 digits', () => {
    const code = EStatClient.normalizeAreaCode('1310', 'municipality')
    expect(code).toBe('01310')
  })

  it('normalizeAreaCode pads prefecture code to 2 digits', () => {
    const code = EStatClient.normalizeAreaCode('1', 'prefecture')
    expect(code).toBe('01')
  })
})
