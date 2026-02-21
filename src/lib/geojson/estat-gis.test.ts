import { describe, it, expect } from 'vitest'
import { EStatGisClient } from './estat-gis'

describe('EStatGisClient', () => {
  it('builds correct municipality GeoJSON URL', () => {
    const client = new EStatGisClient()
    const url = client.buildMunicipalityUrl('13')
    expect(url).toContain('niiyz')
    expect(url).toContain('/13.json')
  })

  it('normalizes 1-digit prefCode to 2 digits', () => {
    const client = new EStatGisClient()
    const url = client.buildMunicipalityUrl('1')
    expect(url).toContain('/01.json')
  })

  it('generates correct cache key', () => {
    const key = EStatGisClient.cacheKey('13')
    expect(key).toBe('geojson:municipality:13')
  })
})
