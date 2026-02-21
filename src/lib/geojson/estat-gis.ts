const NIIYZ_GEOJSON_BASE =
  'https://raw.githubusercontent.com/niiyz/JapanCityGeoJson/master/geojson/prefectures'

export class EStatGisClient {
  buildMunicipalityUrl(prefCode: string): string {
    const normalized = prefCode.padStart(2, '0')
    return `${NIIYZ_GEOJSON_BASE}/${normalized}.json`
  }

  async fetchMunicipalityGeoJson(prefCode: string): Promise<GeoJSON.FeatureCollection> {
    const url = this.buildMunicipalityUrl(prefCode)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Municipality GeoJSON fetch error: ${res.status}`)
    return res.json()
  }

  static cacheKey(prefCode: string): string {
    return `geojson:municipality:${prefCode}`
  }
}
