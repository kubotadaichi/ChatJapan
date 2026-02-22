import { tool } from 'ai'
import { z } from 'zod'
import { EStatClient } from '@/lib/estat/client'
import type { EStatResponse } from '@/lib/estat/client'
import { STATISTICS_CATEGORIES, getCategoryById } from '@/lib/estat/categories'

type StatData = NonNullable<EStatResponse['GET_STATS_DATA']['STATISTICAL_DATA']>

export function createStatisticsTools(estatApiKey: string) {
  const client = new EStatClient(estatApiKey)

  return {
    listStatisticsCategories: tool({
      description:
        '利用可能な統計カテゴリの一覧を返します。ユーザーの質問に最適なカテゴリを選択するために呼び出してください。',
      inputSchema: z.object({}),
      execute: async () => {
        return {
          categories: STATISTICS_CATEGORIES.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            coverage: c.coverage,
            coverageNote: c.coverageNote ?? null,
          })),
        }
      },
    }),

    searchStatsList: tool({
      description:
        'e-Stat APIで利用可能な統計表をキーワードで検索します。特定のトピックに関する統計表IDを探す際や、既存のカテゴリに含まれないデータを探す際に使用してください。',
      inputSchema: z.object({
        keyword: z.string().describe('検索キーワード（例: "人口", "農業", "住宅", "教育"）'),
      }),
      execute: async ({ keyword }) => {
        try {
          const response = await client.fetchStatsList({ searchWord: keyword, limit: 10 })
          const dataList = response.GET_STATS_LIST.DATALIST_INF
          if (!dataList) {
            return { totalCount: 0, tables: [], message: 'データが見つかりませんでした' }
          }

          const tables = Array.isArray(dataList.TABLE_INF)
            ? dataList.TABLE_INF
            : [dataList.TABLE_INF]

          return {
            totalCount: dataList.NUMBER,
            tables: tables.map((t) => ({
              id: t['@id'],
              statisticsName: t.STATISTICS_NAME,
              title: typeof t.TITLE === 'string' ? t.TITLE : t.TITLE['$'],
              govOrg: t.GOV_ORG['$'],
              cycle: t.CYCLE,
              surveyDate: t.SURVEY_DATE,
              totalRecords: t.OVERALL_TOTAL_NUMBER,
            })),
          }
        } catch (error) {
          return { error: `統計表の検索エラー: ${String(error)}`, tables: [] }
        }
      },
    }),

    fetchStatistics: tool({
      description: `指定したエリアの統計データをe-Stat APIから取得します。
areaCodeは市区町村コード(5桁, 例: 13113)または都道府県コード(2桁, 例: 13)を使用してください。
市区町村レベルのデータが取得できない場合は自動的に都道府県レベルにフォールバックします。
都道府県レベルも失敗した場合はsearchStatsListで別の統計表IDを探してください。`,
      inputSchema: z.object({
        categoryId: z.string().describe('統計カテゴリID (listStatisticsCategoriesで取得)'),
        areaCode: z.string().describe('市区町村コード(例: 13113)または都道府県コード(例: 13)'),
        prefCode: z.string().describe('都道府県コード2桁 (例: 13)'),
      }),
      execute: async ({ categoryId, areaCode, prefCode }) => {
        const category = getCategoryById(categoryId)
        if (!category) {
          return { error: `カテゴリ '${categoryId}' が見つかりません` }
        }

        const decodeValues = (statData: StatData | null, statsId: string) => {
          if (!statData) return { statsId, error: 'データなし', values: [] }
          const classMap = EStatClient.buildClassMap(statData.CLASS_INF)
          const tableName = typeof statData.TABLE_INF.TITLE === 'string'
            ? statData.TABLE_INF.TITLE
            : statData.TABLE_INF.TITLE['$']
          const decodedValues = statData.DATA_INF.VALUE.slice(0, 50).map((v) => {
            const decoded: Record<string, string> = {
              値: v['$'],
              地域: classMap['area']?.[v['@area']] ?? v['@area'],
              時点: classMap['time']?.[v['@time']] ?? v['@time'],
            }
            Object.entries(v).forEach(([key, val]) => {
              if (key.startsWith('@cat')) {
                const catId = key.slice(1)
                const classObjArray = Array.isArray(statData.CLASS_INF.CLASS_OBJ)
                  ? statData.CLASS_INF.CLASS_OBJ
                  : [statData.CLASS_INF.CLASS_OBJ]
                const classObj = classObjArray.find((c) => c['@id'] === catId)
                const label = classObj?.['@name'] ?? catId
                decoded[label] = classMap[catId]?.[val] ?? val
              }
            })
            return decoded
          })
          return {
            statsId,
            tableName,
            statisticsName: statData.TABLE_INF.STATISTICS_NAME,
            surveyDate: statData.TABLE_INF.SURVEY_DATE,
            totalCount: statData.RESULT_INF.TOTAL_NUMBER,
            shownCount: decodedValues.length,
            values: decodedValues,
          }
        }

        const fetchForArea = async (code: string) => {
          return Promise.all(
            category.statsIds.map(async (statsId) => {
              const response = await client.fetchStatsData(statsId, code, { limit: 100 })
              return decodeValues(response.GET_STATS_DATA.STATISTICAL_DATA ?? null, statsId)
            })
          )
        }

        const level = areaCode.length <= 2 ? 'prefecture' : 'municipality'
        const normalizedCode = EStatClient.normalizeAreaCode(areaCode, level)

        // 市区町村レベルで試みる
        try {
          const results = await fetchForArea(normalizedCode)
          return {
            categoryId: category.id,
            category: category.name,
            categoryCoverage: category.coverage,
            areaCode: normalizedCode,
            dataLevel: level,
            requestedDataLevel: level,
            resolvedDataLevel: level,
            coverageMismatch: false,
            data: results,
          }
        } catch (muniError) {
          // 市区町村レベル失敗時は都道府県レベルにフォールバック
          if (level === 'municipality') {
            try {
              const prefNormalized = EStatClient.normalizeAreaCode(prefCode, 'prefecture')
              const results = await fetchForArea(prefNormalized)
              return {
                categoryId: category.id,
                category: category.name,
                categoryCoverage: category.coverage,
                areaCode: prefNormalized,
                dataLevel: 'prefecture',
                requestedDataLevel: 'municipality',
                resolvedDataLevel: 'prefecture',
                coverageMismatch: true,
                note: `市区町村レベル(${normalizedCode})のデータが取得できないため、都道府県レベル(${prefNormalized})のデータを返します。ユーザーにその旨を伝えてください。`,
                data: results,
              }
            } catch (prefError) {
              return { error: `データ取得エラー（市区町村・都道府県ともに失敗）: 市区町村=${String(muniError)}, 都道府県=${String(prefError)}` }
            }
          }
          return { error: `データ取得エラー: ${String(muniError)}` }
        }
      },
    }),

    fetchStatsByStatsId: tool({
      description: `statsDataId（統計表ID）を直接指定して統計データを取得します。
searchStatsListで見つけた統計表IDを使って任意のデータを取得できます。
areaCodeは市区町村コード(5桁, 例: 13113)または都道府県コード(2桁, 例: 13)を使用してください。`,
      inputSchema: z.object({
        statsDataId: z.string().describe('統計表ID (例: 0003410379)'),
        areaCode: z.string().describe('市区町村コード(例: 13113)または都道府県コード(例: 13)'),
      }),
      execute: async ({ statsDataId, areaCode }) => {
        const level = areaCode.length <= 2 ? 'prefecture' : 'municipality'
        const normalizedCode = EStatClient.normalizeAreaCode(areaCode, level)

        try {
          const response = await client.fetchStatsData(statsDataId, normalizedCode, { limit: 100 })
          const statData = response.GET_STATS_DATA.STATISTICAL_DATA
          if (!statData) {
            return { error: 'データが見つかりませんでした', statsDataId, areaCode: normalizedCode }
          }

          const classMap = EStatClient.buildClassMap(statData.CLASS_INF)

          const tableName = typeof statData.TABLE_INF.TITLE === 'string'
            ? statData.TABLE_INF.TITLE
            : statData.TABLE_INF.TITLE['$']

          const decodedValues = statData.DATA_INF.VALUE.slice(0, 50).map((v) => {
            const decoded: Record<string, string> = {
              値: v['$'],
              地域: classMap['area']?.[v['@area']] ?? v['@area'],
              時点: classMap['time']?.[v['@time']] ?? v['@time'],
            }
            Object.entries(v).forEach(([key, val]) => {
              if (key.startsWith('@cat')) {
                const catId = key.slice(1)
                const classObjArray = Array.isArray(statData.CLASS_INF.CLASS_OBJ)
                  ? statData.CLASS_INF.CLASS_OBJ
                  : [statData.CLASS_INF.CLASS_OBJ]
                const classObj = classObjArray.find((c) => c['@id'] === catId)
                const label = classObj?.['@name'] ?? catId
                decoded[label] = classMap[catId]?.[val] ?? val
              }
            })
            return decoded
          })

          return {
            statsDataId,
            tableName,
            statisticsName: statData.TABLE_INF.STATISTICS_NAME,
            surveyDate: statData.TABLE_INF.SURVEY_DATE,
            areaCode: normalizedCode,
            totalCount: statData.RESULT_INF.TOTAL_NUMBER,
            shownCount: decodedValues.length,
            values: decodedValues,
          }
        } catch (error) {
          return { error: `データ取得エラー: ${String(error)}` }
        }
      },
    }),

    getAreaInfo: tool({
      description: 'エリアの基本情報（面積、隣接エリアなど）を返します。',
      inputSchema: z.object({
        areaCode: z.string().describe('市区町村コードまたは都道府県コード'),
        areaName: z.string().describe('エリア名'),
      }),
      execute: async ({ areaCode, areaName }) => {
        return {
          areaCode,
          areaName,
          note: '詳細な面積・隣接情報は今後のアップデートで追加予定です。',
        }
      },
    }),

    addArea: tool({
      description: `ユーザーが言及した地名をエリアとして地図上に追加します。
ユーザーが特定の都市・区・市町村・都道府県名を言及したとき、このツールを呼び出してエリアを設定してください。
areaCodeには e-Stat の地域コードを使用してください（都道府県: 2桁, 市区町村: 5桁）。`,
      inputSchema: z.object({
        name: z.string().describe('エリア名（例: 渋谷区, 東京都）'),
        code: z.string().describe('地域コード（都道府県2桁 or 市区町村5桁, 例: 13113）'),
        prefCode: z.string().describe('都道府県コード2桁（例: 13）'),
        level: z.enum(['prefecture', 'municipality']).describe('エリアの粒度'),
      }),
      execute: async ({ name, code, prefCode, level }) => {
        return { name, code, prefCode, level }
      },
    }),
  }
}
