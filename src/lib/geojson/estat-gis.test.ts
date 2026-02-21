import { describe, it, expect } from 'vitest'
import { EStatGisClient } from './estat-gis'

describe('EStatGisClient', () => {
  it('builds correct municipality GeoJSON URL', () => {
    const client = new EStatGisClient('test-key')
    const url = client.buildMunicipalityUrl('13')
    expect(url).toContain('appId=test-key')
    expect(url).toContain('regionCode=13')
    expect(url).toContain('geometryType=1')
    expect(url).toContain('format=geojson')
  })

  it('throws if API key is empty', () => {
    expect(() => new EStatGisClient('')).toThrow('e-Stat GIS API key is required')
  })

  it('generates correct cache key', () => {
    const key = EStatGisClient.cacheKey('13')
    expect(key).toBe('geojson:municipality:13')
  })

  it('normalizes 1-digit prefCode to 2 digits', () => {
    const client = new EStatGisClient('test-key')
    const url = client.buildMunicipalityUrl('1')
    expect(url).toContain('regionCode=01')
  })
})
