const ESTAT_GIS_BASE = 'https://www.e-stat.go.jp/api/v3/statmap/boundary'

export class EStatGisClient {
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('e-Stat GIS API key is required')
    this.apiKey = apiKey
  }

  buildMunicipalityUrl(prefCode: string): string {
    const normalized = prefCode.padStart(2, '0')
    const params = new URLSearchParams({
      appId: this.apiKey,
      regionCode: normalized,
      year: '2020',
      geometryType: '1',
      format: 'geojson',
    })
    return `${ESTAT_GIS_BASE}?${params.toString()}`
  }

  async fetchMunicipalityGeoJson(prefCode: string): Promise<GeoJSON.FeatureCollection> {
    const url = this.buildMunicipalityUrl(prefCode)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`e-Stat GIS API error: ${res.status}`)
    return res.json()
  }

  static cacheKey(prefCode: string): string {
    return `geojson:municipality:${prefCode}`
  }
}
