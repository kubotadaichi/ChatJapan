# Statistics Category Foundation & UI Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 統計カテゴリを今後拡張しやすい基盤へ更新し、入力欄上にカテゴリ対応状況（市区町村/都道府県/混在）を常時表示する。

**Architecture:** カテゴリ定義は `categories.ts` を単一ソースとし、`coverage` メタデータを追加する。UIはカテゴリ一覧APIから表示専用データを取得し、ChatInputで常時チップ表示する。統計取得時は静的 `coverage` と実際の取得レベルを照合し、矛盾時のみ `coverageMismatch` と説明 `note` を返して補正する。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vercel AI SDK (tools), e-Stat API, Vitest + Testing Library

---

### Task 1: カテゴリ型と静的定義を拡張する

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/estat/categories.ts`
- Create: `src/lib/estat/categories.test.ts`
- Test: `src/lib/estat/categories.test.ts`

**Step 1: Write the failing test (@superpowers:test-driven-development)**

```ts
// src/lib/estat/categories.test.ts
import { describe, it, expect } from 'vitest'
import { STATISTICS_CATEGORIES } from './categories'

describe('STATISTICS_CATEGORIES', () => {
  it('has unique category ids', () => {
    const ids = STATISTICS_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('defines coverage for all categories', () => {
    for (const c of STATISTICS_CATEGORIES) {
      expect(['municipality', 'prefecture', 'mixed']).toContain(c.coverage)
    }
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/estat/categories.test.ts`
Expected: FAIL（`coverage` プロパティが未定義）

**Step 3: Write minimal implementation**

```ts
// src/lib/types.ts
export type StatisticsCoverage = 'municipality' | 'prefecture' | 'mixed'

export type StatisticsCategory = {
  id: string
  name: string
  description: string
  statsIds: string[]
  coverage: StatisticsCoverage
  coverageNote?: string
}
```

```ts
// src/lib/estat/categories.ts
export const STATISTICS_CATEGORIES: StatisticsCategory[] = [
  {
    id: 'population',
    name: '人口統計',
    description: '...',
    statsIds: ['0003448299'],
    coverage: 'municipality',
  },
  // 既存カテゴリも coverage を明示
]
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/estat/categories.test.ts src/lib/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/estat/categories.ts src/lib/estat/categories.test.ts
git commit -m "feat: add coverage metadata to statistics categories"
```

### Task 2: カテゴリ一覧APIを追加する（UI表示専用）

**Files:**
- Create: `src/app/api/statistics/categories/route.ts`
- Create: `src/app/api/statistics/categories/route.test.ts`
- Test: `src/app/api/statistics/categories/route.test.ts`

**Step 1: Write the failing test (@superpowers:test-driven-development)**

```ts
// src/app/api/statistics/categories/route.test.ts
import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('GET /api/statistics/categories', () => {
  it('returns categories with coverage fields', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.categories)).toBe(true)
    expect(body.categories[0]).toHaveProperty('id')
    expect(body.categories[0]).toHaveProperty('coverage')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/api/statistics/categories/route.test.ts`
Expected: FAIL（`route.ts` が未作成）

**Step 3: Write minimal implementation**

```ts
// src/app/api/statistics/categories/route.ts
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
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/app/api/statistics/categories/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/statistics/categories/route.ts src/app/api/statistics/categories/route.test.ts
git commit -m "feat: add statistics categories API for chat UI"
```

### Task 3: LLM Toolにcoverage補正メタデータを追加する

**Files:**
- Modify: `src/lib/llm/tools.ts`
- Modify: `src/lib/llm/tools.test.ts`
- Test: `src/lib/llm/tools.test.ts`

**Step 1: Write the failing test (@superpowers:test-driven-development)**

```ts
// src/lib/llm/tools.test.ts に追加
it('listStatisticsCategories includes coverage metadata', async () => {
  const tools = createStatisticsTools('test-key')
  const result = await tools.listStatisticsCategories.execute({}, { messages: [], toolCallId: 'test' })
  expect(result.categories[0]).toHaveProperty('coverage')
})
```

```ts
// src/lib/llm/tools.test.ts に追加（fetchモック）
it('returns mismatch metadata when municipality request falls back to prefecture', async () => {
  // municipality失敗 -> prefecture成功をモック
  // execute(fetchStatistics)
  // expect(result.coverageMismatch).toBe(true)
  // expect(result.resolvedDataLevel).toBe('prefecture')
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/llm/tools.test.ts`
Expected: FAIL（`coverage` / `coverageMismatch` がレスポンスに無い）

**Step 3: Write minimal implementation**

```ts
// src/lib/llm/tools.ts 変更点イメージ
listStatisticsCategories -> categories に coverage, coverageNote を含める

fetchStatistics -> 返却へ追加
{
  categoryId: category.id,
  categoryCoverage: category.coverage,
  requestedDataLevel: level,
  resolvedDataLevel: 'municipality' | 'prefecture',
  coverageMismatch: boolean,
}
```

判定ルール（最小）:
- municipality要求でprefecture解決になったら `coverageMismatch: true`
- それ以外は `false`

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/llm/tools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/llm/tools.ts src/lib/llm/tools.test.ts
git commit -m "feat: add coverage reconciliation metadata to statistics tools"
```

### Task 4: 入力欄上にカテゴリ対応チップを常時表示する

**Files:**
- Create: `src/components/chat/CategoryCoverageChips.tsx`
- Create: `src/components/chat/CategoryCoverageChips.test.tsx`
- Modify: `src/components/chat/ChatInput.tsx`
- Modify: `src/components/chat/ChatPanel.tsx`
- Modify: `src/components/chat/ChatPanel.test.tsx`
- Test: `src/components/chat/CategoryCoverageChips.test.tsx`
- Test: `src/components/chat/ChatPanel.test.tsx`

**Step 1: Write the failing tests (@superpowers:test-driven-development)**

```ts
// src/components/chat/CategoryCoverageChips.test.tsx
it('renders coverage badge labels', () => {
  // municipality/prefecture/mixed のラベル表示を確認
})
```

```ts
// src/components/chat/ChatPanel.test.tsx に追加
it('shows categories strip above input when API succeeds', async () => {
  // global.fetch を /api/statistics/categories 用にモック
  // 例: 人口統計, 市区町村 ラベルが見える
})

it('keeps chat input usable when categories API fails', async () => {
  // fetch reject -> 入力欄は表示される
})
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/components/chat/CategoryCoverageChips.test.tsx src/components/chat/ChatPanel.test.tsx`
Expected: FAIL（未実装）

**Step 3: Write minimal implementation**

```tsx
// src/components/chat/CategoryCoverageChips.tsx
export function CategoryCoverageChips({ categories }: { categories: Array<{ id: string; name: string; coverage: 'municipality' | 'prefecture' | 'mixed'; coverageNote?: string | null }> }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5" data-testid="category-coverage-strip">
      {categories.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
          <span>{c.name}</span>
          <span className="opacity-80">{c.coverage === 'municipality' ? '市区町村' : c.coverage === 'prefecture' ? '都道府県' : '混在'}</span>
        </span>
      ))}
    </div>
  )
}
```

```tsx
// src/components/chat/ChatPanel.tsx 変更点イメージ
// useEffectで /api/statistics/categories を取得して state 管理
// 失敗時は空配列で続行
// ChatInputへ categories を渡す
```

```tsx
// src/components/chat/ChatInput.tsx 変更点イメージ
// CategoryCoverageChips を selectedArea chip の上に常時表示（categories.length > 0 の場合）
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/chat/CategoryCoverageChips.test.tsx src/components/chat/ChatPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/CategoryCoverageChips.tsx src/components/chat/CategoryCoverageChips.test.tsx src/components/chat/ChatInput.tsx src/components/chat/ChatPanel.tsx src/components/chat/ChatPanel.test.tsx
git commit -m "feat: show category coverage chips above chat input"
```

### Task 5: システム指示と回帰検証を整える

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `README.md`（必要時のみ）
- Test: `src/lib/llm/tools.test.ts`
- Test: `src/components/chat/ChatPanel.test.tsx`
- Test: `src/components/chat/CategoryCoverageChips.test.tsx`

**Step 1: Write the failing test (if needed)**

`route.ts` 文字列テストが無い場合は追加不要。既存ツールテスト中心で回帰確認。

**Step 2: Run targeted tests before implementation**

Run: `npm run test:run -- src/lib/llm/tools.test.ts src/components/chat/ChatPanel.test.tsx src/components/chat/CategoryCoverageChips.test.tsx`
Expected: 変更があれば一部FAIL

**Step 3: Write minimal implementation**

```ts
// src/app/api/chat/route.ts
// system prompt に1文追加
// 「coverageMismatch / note が返った場合は、利用レベル差分を明示して回答すること」
```

必要なら README に追記:
- 入力欄上のカテゴリ対応表示は参考情報であり、カテゴリ選択は自動

**Step 4: Run full verification (@superpowers:verification-before-completion)**

Run: `npm run test:run`
Expected: PASS（全テスト）

**Step 5: Final commit**

```bash
git add src/app/api/chat/route.ts src/lib/llm/tools.ts src/lib/llm/tools.test.ts src/app/api/statistics/categories/route.ts src/app/api/statistics/categories/route.test.ts src/components/chat/CategoryCoverageChips.tsx src/components/chat/CategoryCoverageChips.test.tsx src/components/chat/ChatInput.tsx src/components/chat/ChatPanel.tsx src/components/chat/ChatPanel.test.tsx src/lib/estat/categories.ts src/lib/estat/categories.test.ts src/lib/types.ts README.md
git commit -m "feat: add extensible category coverage foundation and chat visibility"
```
