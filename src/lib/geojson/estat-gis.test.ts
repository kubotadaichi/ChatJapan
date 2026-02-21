import { describe, it, expect } from 'vitest'
import { EStatGisClient } from './estat-gis'

describe('EStatGisClient', () => {
  it('builds correct municipality list URL using GitHub Contents API', () => {
    const client = new EStatGisClient()
    const url = client.buildMunicipalityListUrl('13')
    expect(url).toContain('api.github.com')
    expect(url).toContain('niiyz/JapanCityGeoJson')
    expect(url).toContain('/geojson/13')
  })

  it('normalizes 1-digit prefCode to 2 digits in list URL', () => {
    const client = new EStatGisClient()
    const url = client.buildMunicipalityListUrl('1')
    expect(url).toContain('/geojson/01')
  })

  it('builds correct individual municipality file URL', () => {
    const client = new EStatGisClient()
    const url = client.buildMunicipalityFileUrl('13', '13101')
    expect(url).toContain('raw.githubusercontent.com')
    expect(url).toContain('niiyz/JapanCityGeoJson')
    expect(url).toContain('/geojson/13/13101.json')
  })

  it('normalizes 1-digit prefCode in file URL', () => {
    const client = new EStatGisClient()
    const url = client.buildMunicipalityFileUrl('1', '01101')
    expect(url).toContain('/geojson/01/01101.json')
  })

  it('generates correct cache key', () => {
    const key = EStatGisClient.cacheKey('13')
    expect(key).toBe('geojson:municipality:13')
  })
})
