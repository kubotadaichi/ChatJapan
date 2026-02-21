import type { StatisticsCategory } from '@/lib/types'

export const STATISTICS_CATEGORIES: StatisticsCategory[] = [
  {
    id: 'population',
    name: '人口統計',
    description: '国勢調査による人口・年齢構成・世帯数・人口密度などの情報',
    statsIds: ['0003410379'],
  },
  {
    id: 'commerce',
    name: '商業統計',
    description: '小売業・卸売業の店舗数・売上高・従業者数などの商業情報',
    statsIds: ['0003146045'],
  },
  {
    id: 'economy',
    name: '経済センサス',
    description: '事業所数・従業員数・産業構造など経済活動の基本情報',
    statsIds: ['0003215767'],
  },
]

export function getCategoryById(id: string): StatisticsCategory | undefined {
  return STATISTICS_CATEGORIES.find((c) => c.id === id)
}
