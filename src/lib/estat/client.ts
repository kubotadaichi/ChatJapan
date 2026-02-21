const ESTAT_API_BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

export interface EStatStatsDataParams {
  statsDataId: string
  cdArea?: string
  cdCat01?: string
  limit?: number
}

export interface EStatResponse {
  GET_STATS_DATA: {
    RESULT: { STATUS: number; ERROR_MSG: string }
    STATISTICAL_DATA?: {
      DATA_INF: {
        VALUE: Array<{
          '@area': string
          '@cat01'?: string
          '@time': string
          '$': string
        }>
      }
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
      ...(params?.cdCat01 ? { cdCat01: params.cdCat01 } : {}),
      ...(params?.limit ? { limit: String(params.limit) } : {}),
    })
    return `${ESTAT_API_BASE}/getStatsData?${searchParams.toString()}`
  }

  async fetchStatsData(statsDataId: string, areaCode: string): Promise<EStatResponse> {
    const url = this.buildStatsDataUrl(statsDataId, areaCode)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`e-Stat API error: ${res.status}`)
    return res.json()
  }

  static normalizeAreaCode(code: string, level: 'prefecture' | 'municipality'): string {
    if (level === 'municipality') {
      return code.padStart(5, '0')
    }
    return code.padStart(2, '0')
  }
}
