import type { StatisticsCoverage } from '@/lib/types'

export interface CategoryCoverageItem {
  id: string
  name: string
  coverage: StatisticsCoverage
  coverageNote?: string | null
}

const COVERAGE_LABELS: Record<StatisticsCoverage, string> = {
  municipality: '市区町村',
  prefecture: '都道府県',
  mixed: '混在',
}

interface CategoryCoverageChipsProps {
  categories: CategoryCoverageItem[]
}

export function CategoryCoverageChips({ categories }: CategoryCoverageChipsProps) {
  if (categories.length === 0) return null

  return (
    <div className="mb-2 flex flex-wrap gap-1.5" data-testid="category-coverage-strip">
      {categories.map((category) => (
        <span
          key={category.id}
          title={category.coverageNote ?? undefined}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
        >
          <span>{category.name}</span>
          <span className="opacity-80">{COVERAGE_LABELS[category.coverage]}</span>
        </span>
      ))}
    </div>
  )
}
