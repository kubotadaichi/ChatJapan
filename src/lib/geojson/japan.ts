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

  const areaCode = props[PROP_AREA_CODE] as string
  if (!areaCode) return null

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

export const PREFECTURE_GEOJSON_URL = '/geojson/prefectures.geojson'

export const MUNICIPALITY_GEOJSON_URL_TEMPLATE = (prefCode: string) =>
  `/geojson/municipalities/${prefCode}.geojson`
