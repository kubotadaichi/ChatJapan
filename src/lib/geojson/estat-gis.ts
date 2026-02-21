// niiyz/JapanCityGeoJson: 個別市区町村ファイルが geojson/{prefCode}/{muniCode}.json にある
const NIIYZ_RAW_BASE = 'https://raw.githubusercontent.com/niiyz/JapanCityGeoJson/master/geojson'
const NIIYZ_API_BASE = 'https://api.github.com/repos/niiyz/JapanCityGeoJson/contents/geojson'

interface GitHubFileEntry {
  name: string
  download_url: string
}

export class EStatGisClient {
  /**
   * 都道府県の市区町村ファイル一覧を返す GitHub Contents API URL
   * 例: 13 → https://api.github.com/repos/niiyz/JapanCityGeoJson/contents/geojson/13
   */
  buildMunicipalityListUrl(prefCode: string): string {
    const normalized = prefCode.padStart(2, '0')
    return `${NIIYZ_API_BASE}/${normalized}`
  }

  /**
   * 個別市区町村ファイルのダウンロード URL
   * 例: 13, 13101 → https://raw.githubusercontent.com/.../geojson/13/13101.json
   */
  buildMunicipalityFileUrl(prefCode: string, muniCode: string): string {
    const normalized = prefCode.padStart(2, '0')
    return `${NIIYZ_RAW_BASE}/${normalized}/${muniCode}.json`
  }

  async fetchMunicipalityGeoJson(prefCode: string): Promise<GeoJSON.FeatureCollection> {
    // GitHub Contents API でファイル一覧を取得（1リクエスト）
    const listUrl = this.buildMunicipalityListUrl(prefCode)
    const listRes = await fetch(listUrl, {
      headers: { 'User-Agent': 'ChatJapan-App' },
    })
    if (!listRes.ok) {
      throw new Error(`Failed to list municipalities for prefCode ${prefCode}: ${listRes.status}`)
    }

    const files: GitHubFileEntry[] = await listRes.json()
    const jsonFiles = files.filter((f) => f.name.endsWith('.json'))

    // 全市区町村ファイルを並列フェッチして結合
    const featureArrays = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const res = await fetch(file.download_url)
          if (!res.ok) return [] as GeoJSON.Feature[]
          const fc: GeoJSON.FeatureCollection = await res.json()
          return fc.features
        } catch {
          return [] as GeoJSON.Feature[]
        }
      })
    )

    return {
      type: 'FeatureCollection',
      features: featureArrays.flat(),
    }
  }

  static cacheKey(prefCode: string): string {
    return `geojson:municipality:${prefCode}`
  }
}
