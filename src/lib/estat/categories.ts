import type { StatisticsCategory } from '@/lib/types'

// e-Stat 統計表ID一覧
// 各IDは e-Stat (https://www.e-stat.go.jp/stat-search) で検索・確認できます
// getStatsList ツールを使ってキーワード検索で最新IDを取得することも可能です
export const STATISTICS_CATEGORIES: StatisticsCategory[] = [
  {
    id: 'population',
    name: '人口統計',
    description: '国勢調査による人口・年齢構成・世帯数などの情報（2020年調査）',
    // 年齢（3区分），男女別人口及び年齢別割合 - 都道府県，市区町村（令和2年）
    statsIds: ['0003448299'],
  },
  {
    id: 'commerce',
    name: '商業統計',
    description: '小売業・卸売業の店舗数・売上高・従業者数などの商業情報',
    // 産業編（市区町村表）- 事業所数，従業者数，年間商品販売額，売場面積
    statsIds: ['0003149505'],
  },
  {
    id: 'economy',
    name: '経済センサス',
    description: '事業所数・従業員数・産業構造など経済活動の基本情報',
    // 産業（大分類），経営組織別 事業所・民営事業所数及び従業者数 - 全国，都道府県，市区町村
    statsIds: ['0003353941'],
  },
]

export function getCategoryById(id: string): StatisticsCategory | undefined {
  return STATISTICS_CATEGORIES.find((c) => c.id === id)
}
