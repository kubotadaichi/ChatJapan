import type { SelectedArea, AreaLevel } from '@/lib/types'

const PROP_PREF_NAME = 'N03_001'
const PROP_CITY_NAME = 'N03_004'
const PROP_AREA_CODE = 'N03_007'

export function extractAreaFromFeature(
  feature: GeoJSON.Feature,
  level: AreaLevel
): SelectedArea | null {
  const props = feature.properties
  if (!props) return null

  // e-Stat 境界データ形式 (N03_xxx)
  const areaCode = props[PROP_AREA_CODE] as string
  if (areaCode) {
    const prefCode = areaCode.slice(0, 2)
    if (level === 'prefecture') {
      const name = props[PROP_PREF_NAME] as string
      if (!name) return null
      return { name, code: prefCode, prefCode, level: 'prefecture' }
    }
    const name = props[PROP_CITY_NAME] as string
    if (!name) return null
    return { name, code: areaCode, prefCode, level: 'municipality' }
  }

  // dataofjapan/land 形式 (nam_ja + id)
  const namJa = props['nam_ja'] as string
  const id = props['id'] as number
  if (namJa && id !== undefined) {
    const prefCode = String(id).padStart(2, '0')
    return { name: namJa, code: prefCode, prefCode, level: 'prefecture' }
  }

  return null
}

export const PREFECTURE_GEOJSON_URL = '/geojson/prefectures.geojson'

export const MUNICIPALITY_GEOJSON_URL_TEMPLATE = (prefCode: string) =>
  `/geojson/municipalities/${prefCode}.geojson`
