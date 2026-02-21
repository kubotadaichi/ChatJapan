import { tool } from 'ai'
import { z } from 'zod'
import { EStatClient } from '@/lib/estat/client'
import { STATISTICS_CATEGORIES, getCategoryById } from '@/lib/estat/categories'

export function createStatisticsTools(estatApiKey: string) {
  const client = new EStatClient(estatApiKey)

  return {
    listStatisticsCategories: tool({
      description:
        '利用可能な統計カテゴリの一覧を返します。ユーザーの質問に最適なカテゴリを選択するために呼び出してください。',
      parameters: z.object({}),
      execute: async () => {
        return {
          categories: STATISTICS_CATEGORIES.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
          })),
        }
      },
    }),

    fetchStatistics: tool({
      description:
        '指定したエリアの統計データをe-Stat APIから取得します。areaCodeは市区町村コード(5桁)または都道府県コード(2桁)を使用してください。',
      parameters: z.object({
        categoryId: z.string().describe('統計カテゴリID (listStatisticsCategoriesで取得)'),
        areaCode: z.string().describe('市区町村コード(例: 13113)または都道府県コード(例: 13)'),
        prefCode: z.string().describe('都道府県コード2桁 (例: 13)'),
      }),
      execute: async ({ categoryId, areaCode }) => {
        const category = getCategoryById(categoryId)
        if (!category) {
          return { error: `カテゴリ '${categoryId}' が見つかりません` }
        }

        const normalizedCode = EStatClient.normalizeAreaCode(
          areaCode,
          areaCode.length <= 2 ? 'prefecture' : 'municipality'
        )

        try {
          const results = await Promise.all(
            category.statsIds.map((statsId) =>
              client.fetchStatsData(statsId, normalizedCode)
            )
          )

          return {
            category: category.name,
            areaCode: normalizedCode,
            data: results.map((r, i) => ({
              statsId: category.statsIds[i],
              result: r.GET_STATS_DATA.STATISTICAL_DATA?.DATA_INF.VALUE ?? [],
            })),
          }
        } catch (error) {
          return { error: `データ取得エラー: ${String(error)}` }
        }
      },
    }),

    getAreaInfo: tool({
      description: 'エリアの基本情報（面積、隣接エリアなど）を返します。',
      parameters: z.object({
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
  }
}
