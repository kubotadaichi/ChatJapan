const ESTAT_API_BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

export interface EStatStatsDataParams {
  statsDataId: string
  cdArea?: string
  cdCat01?: string
  cdTime?: string
  startPosition?: number
  limit?: number
  metaGetFlg?: 'Y' | 'N'
}

export interface EStatClass {
  '@code': string
  '@name': string
  '@level'?: string
  '@parentCode'?: string
  '@addInf'?: string
}

export interface EStatClassObj {
  '@id': string
  '@name': string
  '@description'?: string
  CLASS: EStatClass | EStatClass[]
}

export interface EStatValue {
  '@area': string
  '@time': string
  '$': string
  [key: string]: string // @tab, @cat01-15 etc.
}

export interface EStatResponse {
  GET_STATS_DATA: {
    RESULT: { STATUS: number; ERROR_MSG: string; DATE: string }
    PARAMETER?: Record<string, unknown>
    STATISTICAL_DATA?: {
      RESULT_INF: {
        FROM_NUMBER: number
        TO_NUMBER: number
        NEXT_KEY?: string
        TOTAL_NUMBER: number
      }
      TABLE_INF: {
        '@id': string
        STAT_NAME: { '@code': string; '$': string }
        GOV_ORG: { '@code': string; '$': string }
        STATISTICS_NAME: string
        TITLE: { '@no': string; '$': string } | string
        CYCLE: string
        SURVEY_DATE: number
        OPEN_DATE: string
      }
      CLASS_INF: {
        CLASS_OBJ: EStatClassObj | EStatClassObj[]
      }
      DATA_INF: {
        NOTE?: { '@char': string; '$': string } | Array<{ '@char': string; '$': string }>
        VALUE: EStatValue[]
      }
    }
  }
}

export interface EStatTableInfo {
  '@id': string
  STAT_NAME: { '@code': string; '$': string }
  GOV_ORG: { '@code': string; '$': string }
  STATISTICS_NAME: string
  TITLE: { '@no'?: string; '$': string } | string
  CYCLE: string
  SURVEY_DATE: number
  OPEN_DATE: string
  SMALL_AREA: number
  COLLECT_AREA: string
  MAIN_CATEGORY: { '@code': string; '$': string }
  SUB_CATEGORY: { '@code': string; '$': string }
  OVERALL_TOTAL_NUMBER: number
  UPDATED_DATE: string
}

export interface EStatStatsListResponse {
  GET_STATS_LIST: {
    RESULT: { STATUS: number; ERROR_MSG: string; DATE: string }
    DATALIST_INF?: {
      NUMBER: number
      RESULT_INF: {
        FROM_NUMBER: number
        TO_NUMBER: number
      }
      TABLE_INF: EStatTableInfo | EStatTableInfo[]
    }
  }
}

export class EStatClient {
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('e-Stat API key is required')
    this.apiKey = apiKey
  }

  buildStatsDataUrl(statsDataId: string, areaCode: string, params?: Partial<EStatStatsDataParams>): string {
    const searchParams = new URLSearchParams({
      appId: this.apiKey,
      statsDataId,
      cdArea: areaCode,
      lang: 'J',
      metaGetFlg: params?.metaGetFlg ?? 'Y',
      ...(params?.cdCat01 ? { cdCat01: params.cdCat01 } : {}),
      ...(params?.cdTime ? { cdTime: params.cdTime } : {}),
      ...(params?.startPosition ? { startPosition: String(params.startPosition) } : {}),
      ...(params?.limit ? { limit: String(params.limit) } : { limit: '100' }),
    })
    return `${ESTAT_API_BASE}/getStatsData?${searchParams.toString()}`
  }

  async fetchStatsData(statsDataId: string, areaCode: string, params?: Partial<EStatStatsDataParams>): Promise<EStatResponse> {
    const url = this.buildStatsDataUrl(statsDataId, areaCode, params)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`e-Stat API HTTP error: ${res.status}`)
    const data: EStatResponse = await res.json()
    const status = data.GET_STATS_DATA.RESULT.STATUS
    if (status !== 0) {
      throw new Error(`e-Stat API error (status ${status}): ${data.GET_STATS_DATA.RESULT.ERROR_MSG}`)
    }
    return data
  }

  async fetchStatsList(params: {
    searchWord?: string
    statsField?: string
    limit?: number
    startPosition?: number
  }): Promise<EStatStatsListResponse> {
    const searchParams = new URLSearchParams({
      appId: this.apiKey,
      lang: 'J',
      ...(params.searchWord ? { searchWord: params.searchWord } : {}),
      ...(params.statsField ? { statsField: params.statsField } : {}),
      limit: String(params.limit ?? 10),
      ...(params.startPosition ? { startPosition: String(params.startPosition) } : {}),
    })
    const url = `${ESTAT_API_BASE}/getStatsList?${searchParams.toString()}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`e-Stat API HTTP error: ${res.status}`)
    return res.json()
  }

  /**
   * エリアコードをe-Stat API形式に正規化します
   * - 都道府県: 2桁コード + "000" → 5桁 (例: "13" → "13000", "1" → "01000")
   * - 市区町村: 先頭0埋めで5桁 (例: "1310" → "01310")
   */
  static normalizeAreaCode(code: string, level: 'prefecture' | 'municipality'): string {
    if (level === 'municipality') {
      return code.padStart(5, '0')
    }
    // Prefecture: 2-digit code (left-padded) + "000" suffix = 5 digits
    return code.padStart(2, '0') + '000'
  }

  /**
   * CLASS_INFからコード→名前のマッピングを構築します
   */
  static buildClassMap(classInf: { CLASS_OBJ: EStatClassObj | EStatClassObj[] }): Record<string, Record<string, string>> {
    const classMap: Record<string, Record<string, string>> = {}
    const classObjArray = Array.isArray(classInf.CLASS_OBJ) ? classInf.CLASS_OBJ : [classInf.CLASS_OBJ]
    for (const classObj of classObjArray) {
      const classes = Array.isArray(classObj.CLASS) ? classObj.CLASS : [classObj.CLASS]
      classMap[classObj['@id']] = {}
      for (const cls of classes) {
        classMap[classObj['@id']][cls['@code']] = cls['@name']
      }
    }
    return classMap
  }
}
