import type { StatisticsCategory } from '@/lib/types'

// e-Stat 統計表ID一覧
// 各IDは e-Stat (https://www.e-stat.go.jp/stat-search) で検索・確認できます
// getStatsList ツールを使ってキーワード検索で最新IDを取得することも可能です
export const STATISTICS_CATEGORIES: StatisticsCategory[] = [
  {
    id: 'population',
    name: '人口統計',
    description: '国勢調査による人口・年齢構成・世帯数・人口密度などの情報（2020年調査）',
    // 国勢調査 / 人口等基本集計 / 男女・年齢・配偶関係，世帯の構成，住居の状態など
    statsIds: ['0003410379'],
  },
  {
    id: 'commerce',
    name: '商業統計',
    description: '小売業・卸売業の店舗数・売上高・従業者数などの商業情報',
    // 商業統計調査 / 産業編（都道府県表）
    statsIds: ['0003146045'],
  },
  {
    id: 'economy',
    name: '経済センサス',
    description: '事業所数・従業員数・産業構造など経済活動の基本情報',
    // 経済センサス－活動調査 / 産業横断的集計 / 事業所に関する集計
    statsIds: ['0003215767'],
  },
]

export function getCategoryById(id: string): StatisticsCategory | undefined {
  return STATISTICS_CATEGORIES.find((c) => c.id === id)
}
