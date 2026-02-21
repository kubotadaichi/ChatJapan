// src/lib/types.ts

export type AreaLevel = 'prefecture' | 'municipality'

export interface SelectedArea {
  name: string        // "渋谷区"
  code: string        // "13113" (市区町村コード5桁 or 都道府県コード2桁)
  prefCode: string    // "13"
  level: AreaLevel
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  selectedArea?: SelectedArea
  createdAt: Date
}

export interface ChatSession {
  id: string
  messages: Message[]
  createdAt: Date
}

export type StatisticsCoverage = 'municipality' | 'prefecture' | 'mixed'

export type StatisticsCategory = {
  id: string          // "population", "commerce", "economy"
  name: string        // "人口統計"
  description: string // "国勢調査による人口・世帯情報"
  statsIds: string[]  // e-Stat の統計表ID一覧
  coverage: StatisticsCoverage
  coverageNote?: string
}
