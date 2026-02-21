import { NextResponse } from 'next/server'
import { STATISTICS_CATEGORIES } from '@/lib/estat/categories'

export async function GET() {
  return NextResponse.json({
    categories: STATISTICS_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      coverage: c.coverage,
      coverageNote: c.coverageNote ?? null,
    })),
  })
}
