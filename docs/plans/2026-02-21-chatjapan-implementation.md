# ChatJapan Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 日本の地図でエリアを選択しながら統計情報を参照して回答するチャットサービスを構築する（Phase 1〜4: コア機能 + Vercelデプロイ + 認証）

**Architecture:** Next.js 15 App Router のスプリットスクリーンレイアウト。左パネルにMapLibre GL JSの地図、右パネルにチャットUI。地図クリックで選択エリアをコンテキストとしてLLMに渡し、Vercel AI SDKのTool CallingでリアルタイムにeState APIから統計データを取得して回答する。

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, MapLibre GL JS, Vercel AI SDK, NextAuth.js, Vercel Postgres, Vercel KV, e-Stat API

---

## Task 1: Next.js プロジェクトセットアップ

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `vitest.config.ts`

**Step 1: プロジェクト作成**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

**Step 2: 依存パッケージをインストール**

```bash
npm install maplibre-gl @types/maplibre-gl
npm install ai @ai-sdk/openai @ai-sdk/anthropic
npm install next-auth @auth/prisma-adapter
npm install @prisma/client prisma
npm install @vercel/kv
npm install lucide-react class-variance-authority clsx tailwind-merge

npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 3: shadcn/ui セットアップ**

```bash
npx shadcn@latest init
# style: default, base color: zinc, CSS variables: yes
npx shadcn@latest add button input scroll-area separator
```

**Step 4: vitest.config.ts を作成**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Step 5: テストセットアップファイルを作成**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
```

**Step 6: package.json にテストスクリプトを追加**

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```

**Step 7: 動作確認**

```bash
npm run dev
# http://localhost:3000 が表示されることを確認
npm run test:run
# テストが0件でエラーなく終了することを確認
```

**Step 8: コミット**

```bash
git add -A
git commit -m "feat: initial Next.js 15 project setup with Vitest"
```

---

## Task 2: 型定義とプロジェクト構造

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/types.test.ts`

**Step 1: 型定義を作成**

```typescript
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

export type StatisticsCategory = {
  id: string          // "population", "commerce", "economy"
  name: string        // "人口統計"
  description: string // "国勢調査による人口・世帯情報"
  statsIds: string[]  // e-Stat の統計表ID一覧
}
```

**Step 2: 型定義のテストを作成（型チェックが通ることを確認するだけ）**

```typescript
// src/lib/types.test.ts
import { describe, it, expect } from 'vitest'
import type { SelectedArea, Message } from './types'

describe('types', () => {
  it('SelectedArea is correctly typed', () => {
    const area: SelectedArea = {
      name: '渋谷区',
      code: '13113',
      prefCode: '13',
      level: 'municipality',
    }
    expect(area.code).toBe('13113')
    expect(area.level).toBe('municipality')
  })

  it('Message has correct structure', () => {
    const msg: Message = {
      id: '1',
      role: 'user',
      content: 'テスト',
      createdAt: new Date(),
    }
    expect(msg.role).toBe('user')
  })
})
```

**Step 3: テストを実行して通ることを確認**

```bash
npm run test:run
# PASS src/lib/types.test.ts
```

**Step 4: コミット**

```bash
git add src/lib/types.ts src/lib/types.test.ts
git commit -m "feat: add core type definitions"
```

---

## Task 3: スプリットスクリーンレイアウト

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/components/layout/SplitLayout.tsx`
- Create: `src/components/layout/SplitLayout.test.tsx`

**Step 1: SplitLayout のテストを書く**

```typescript
// src/components/layout/SplitLayout.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SplitLayout } from './SplitLayout'

describe('SplitLayout', () => {
  it('renders left and right panels', () => {
    render(
      <SplitLayout
        left={<div data-testid="left">Left</div>}
        right={<div data-testid="right">Right</div>}
      />
    )
    expect(screen.getByTestId('left')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('applies correct layout classes', () => {
    const { container } = render(
      <SplitLayout left={<div />} right={<div />} />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('flex')
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run
# FAIL - SplitLayout not found
```

**Step 3: SplitLayout を実装**

```typescript
// src/components/layout/SplitLayout.tsx
import { ReactNode } from 'react'

interface SplitLayoutProps {
  left: ReactNode
  right: ReactNode
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex-1 min-w-0 border-r border-zinc-200">
        {left}
      </div>
      <div className="flex flex-col w-[480px] shrink-0">
        {right}
      </div>
    </div>
  )
}
```

**Step 4: page.tsx を更新**

```typescript
// src/app/page.tsx
import { SplitLayout } from '@/components/layout/SplitLayout'

export default function Home() {
  return (
    <SplitLayout
      left={
        <div className="flex items-center justify-center h-full text-zinc-400">
          Map Panel (coming soon)
        </div>
      }
      right={
        <div className="flex items-center justify-center h-full text-zinc-400">
          Chat Panel (coming soon)
        </div>
      }
    />
  )
}
```

**Step 5: layout.tsx を更新（全画面表示のため）**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChatJapan',
  description: '日本の統計情報を地図で探索するチャットサービス',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} overflow-hidden`}>{children}</body>
    </html>
  )
}
```

**Step 6: テストを実行して通ることを確認**

```bash
npm run test:run
# PASS src/components/layout/SplitLayout.test.tsx
```

**Step 7: コミット**

```bash
git add src/
git commit -m "feat: add split-screen layout component"
```

---

## Task 4: MapLibre GL JS 地図パネル

**Files:**
- Create: `src/components/map/MapPanel.tsx`
- Create: `src/components/map/MapPanel.test.tsx`
- Create: `src/hooks/useMapSelection.ts`
- Create: `src/hooks/useMapSelection.test.ts`

> **注意:** MapLibre GL JS はブラウザのWebGL APIを使うため、コンポーネントは `'use client'` が必要。テストはモックを使う。

**Step 1: useMapSelection フックのテストを書く**

```typescript
// src/hooks/useMapSelection.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useMapSelection } from './useMapSelection'

describe('useMapSelection', () => {
  it('starts with no selection', () => {
    const { result } = renderHook(() => useMapSelection())
    expect(result.current.selectedArea).toBeNull()
  })

  it('selects an area', () => {
    const { result } = renderHook(() => useMapSelection())
    act(() => {
      result.current.selectArea({
        name: '東京都',
        code: '13',
        prefCode: '13',
        level: 'prefecture',
      })
    })
    expect(result.current.selectedArea?.name).toBe('東京都')
    expect(result.current.selectedArea?.code).toBe('13')
  })

  it('clears selection', () => {
    const { result } = renderHook(() => useMapSelection())
    act(() => {
      result.current.selectArea({
        name: '東京都',
        code: '13',
        prefCode: '13',
        level: 'prefecture',
      })
      result.current.clearSelection()
    })
    expect(result.current.selectedArea).toBeNull()
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run
# FAIL - useMapSelection not found
```

**Step 3: useMapSelection フックを実装**

```typescript
// src/hooks/useMapSelection.ts
import { useState } from 'react'
import type { SelectedArea } from '@/lib/types'

export function useMapSelection() {
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null)

  const selectArea = (area: SelectedArea) => {
    setSelectedArea(area)
  }

  const clearSelection = () => {
    setSelectedArea(null)
  }

  return { selectedArea, selectArea, clearSelection }
}
```

**Step 4: テストを通すことを確認**

```bash
npm run test:run
# PASS src/hooks/useMapSelection.test.ts
```

**Step 5: MapPanel のテストを書く（MapLibreはモック）**

```typescript
// src/components/map/MapPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MapPanel } from './MapPanel'
import type { SelectedArea } from '@/lib/types'

// MapLibre GL JS をモック
vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      setFeatureState: vi.fn(),
      getFeatureState: vi.fn(),
    })),
    supported: vi.fn().mockReturnValue(true),
  },
}))

describe('MapPanel', () => {
  it('renders the map container', () => {
    const onSelect = vi.fn()
    render(<MapPanel selectedArea={null} onAreaSelect={onSelect} />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('shows selected area name when area is selected', () => {
    const area: SelectedArea = {
      name: '渋谷区',
      code: '13113',
      prefCode: '13',
      level: 'municipality',
    }
    const onSelect = vi.fn()
    render(<MapPanel selectedArea={area} onAreaSelect={onSelect} />)
    expect(screen.getByText('渋谷区を選択中')).toBeInTheDocument()
  })

  it('shows clear button when area is selected', () => {
    const area: SelectedArea = {
      name: '渋谷区',
      code: '13113',
      prefCode: '13',
      level: 'municipality',
    }
    const onSelect = vi.fn()
    render(<MapPanel selectedArea={area} onAreaSelect={onSelect} />)
    expect(screen.getByRole('button', { name: /選択解除/ })).toBeInTheDocument()
  })
})
```

**Step 6: MapPanel を実装**

```typescript
// src/components/map/MapPanel.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { SelectedArea } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface MapPanelProps {
  selectedArea: SelectedArea | null
  onAreaSelect: (area: SelectedArea) => void
  onAreaClear?: () => void
}

export function MapPanel({ selectedArea, onAreaSelect, onAreaClear }: MapPanelProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    let map: unknown

    const initMap = async () => {
      const maplibre = (await import('maplibre-gl')).default
      await import('maplibre-gl/dist/maplibre-gl.css')

      map = new maplibre.Map({
        container: mapContainer.current!,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
            },
          ],
        },
        center: [137.0, 36.5], // 日本の中心
        zoom: 5,
      })

      mapRef.current = map
      // GeoJSON境界データの追加はTask 5で行う
    }

    initMap()

    return () => {
      if (mapRef.current) {
        ;(mapRef.current as { remove: () => void }).remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative h-full">
      {selectedArea && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 text-sm font-medium">
          <span>🗾 {selectedArea.name}を選択中</span>
          {onAreaClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAreaClear}
              className="h-5 w-5 p-0"
              aria-label="選択解除"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      <div
        ref={mapContainer}
        data-testid="map-container"
        className="h-full w-full"
      />
    </div>
  )
}
```

**Step 7: テストを実行して通ることを確認**

```bash
npm run test:run
# PASS src/components/map/MapPanel.test.tsx
# PASS src/hooks/useMapSelection.test.ts
```

**Step 8: page.tsx を更新してMapPanelを組み込む**

```typescript
// src/app/page.tsx
'use client'

import { SplitLayout } from '@/components/layout/SplitLayout'
import { MapPanel } from '@/components/map/MapPanel'
import { useMapSelection } from '@/hooks/useMapSelection'

export default function Home() {
  const { selectedArea, selectArea, clearSelection } = useMapSelection()

  return (
    <SplitLayout
      left={
        <MapPanel
          selectedArea={selectedArea}
          onAreaSelect={selectArea}
          onAreaClear={clearSelection}
        />
      }
      right={
        <div className="flex items-center justify-center h-full text-zinc-400">
          Chat Panel (coming soon)
        </div>
      }
    />
  )
}
```

**Step 9: コミット**

```bash
git add src/
git commit -m "feat: add MapPanel with MapLibre GL JS and area selection hook"
```

---

## Task 5: 日本GeoJSON境界データの統合

**Files:**
- Create: `src/lib/geojson/japan.ts`
- Create: `src/lib/geojson/japan.test.ts`
- Modify: `src/components/map/MapPanel.tsx`

**Step 1: e-Stat境界データのユーティリティをテスト**

```typescript
// src/lib/geojson/japan.test.ts
import { describe, it, expect } from 'vitest'
import { extractAreaFromFeature } from './japan'

describe('extractAreaFromFeature', () => {
  it('extracts prefecture area from GeoJSON feature', () => {
    const feature = {
      properties: {
        N03_001: '東京都',
        N03_007: '13000',  // e-Stat境界データの都道府県コード
      },
    }
    const area = extractAreaFromFeature(feature as GeoJSON.Feature, 'prefecture')
    expect(area?.name).toBe('東京都')
    expect(area?.prefCode).toBe('13')
    expect(area?.level).toBe('prefecture')
  })

  it('extracts municipality area from GeoJSON feature', () => {
    const feature = {
      properties: {
        N03_004: '渋谷区',
        N03_007: '13113',
      },
    }
    const area = extractAreaFromFeature(feature as GeoJSON.Feature, 'municipality')
    expect(area?.name).toBe('渋谷区')
    expect(area?.code).toBe('13113')
    expect(area?.prefCode).toBe('13')
    expect(area?.level).toBe('municipality')
  })

  it('returns null for feature without required properties', () => {
    const feature = { properties: {} }
    const area = extractAreaFromFeature(feature as GeoJSON.Feature, 'prefecture')
    expect(area).toBeNull()
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run
# FAIL - extractAreaFromFeature not found
```

**Step 3: GeoJSONユーティリティを実装**

```typescript
// src/lib/geojson/japan.ts
import type { SelectedArea, AreaLevel } from '@/lib/types'

// e-Stat境界データのプロパティキー
// 参照: https://www.e-stat.go.jp/gis/statmap-search
const PROP_PREF_NAME = 'N03_001'     // 都道府県名
const PROP_CITY_NAME = 'N03_004'     // 市区町村名
const PROP_AREA_CODE = 'N03_007'     // 市区町村コード (5桁)

export function extractAreaFromFeature(
  feature: GeoJSON.Feature,
  level: AreaLevel
): SelectedArea | null {
  const props = feature.properties
  if (!props) return null

  const areaCode = props[PROP_AREA_CODE] as string
  if (!areaCode) return null

  const prefCode = areaCode.slice(0, 2)

  if (level === 'prefecture') {
    const name = props[PROP_PREF_NAME] as string
    if (!name) return null
    return {
      name,
      code: prefCode,
      prefCode,
      level: 'prefecture',
    }
  }

  const name = props[PROP_CITY_NAME] as string
  if (!name) return null
  return {
    name,
    code: areaCode,
    prefCode,
    level: 'municipality',
  }
}

// 都道府県GeoJSONのURL（e-Stat境界データ、2020年）
// 注: 本番では自前のCDNまたはVercel公開ファイルに配置する
export const PREFECTURE_GEOJSON_URL =
  '/geojson/prefectures.geojson'

export const MUNICIPALITY_GEOJSON_URL_TEMPLATE = (prefCode: string) =>
  `/geojson/municipalities/${prefCode}.geojson`
```

**Step 4: テストを通すことを確認**

```bash
npm run test:run
# PASS src/lib/geojson/japan.test.ts
```

**Step 5: GeoJSONファイルを配置**

e-Stat からダウンロードした境界データを `public/geojson/` に配置する。
まずはシンプルに都道府県のみ:

```bash
mkdir -p public/geojson
# e-Stat 境界データ（https://www.e-stat.go.jp/gis/statmap-search）から
# 「都道府県」レベルのGeoJSONをダウンロードして public/geojson/prefectures.geojson として配置
# 開発中はNipponGISや他のオープンデータを使用可能:
# https://github.com/dataofjapan/land (小さいファイルサイズで便利)
```

> **注:** `public/geojson/prefectures.geojson` が存在しない場合、
> https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson を使用可。
> このデータはMITライセンス。

**Step 6: MapPanel にGeoJSONクリック処理を追加**

`src/components/map/MapPanel.tsx` の `initMap()` 内、`mapRef.current = map` の後に追加:

```typescript
// GeoJSON境界データを追加
const response = await fetch(PREFECTURE_GEOJSON_URL)
if (response.ok) {
  const geojson = await response.json()

  ;(map as maplibre.Map).addSource('prefectures', {
    type: 'geojson',
    data: geojson,
  })

  ;(map as maplibre.Map).addLayer({
    id: 'prefectures-fill',
    type: 'fill',
    source: 'prefectures',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#3b82f6',
        'transparent',
      ],
      'fill-opacity': 0.3,
    },
  })

  ;(map as maplibre.Map).addLayer({
    id: 'prefectures-outline',
    type: 'line',
    source: 'prefectures',
    paint: {
      'line-color': '#6b7280',
      'line-width': 1,
    },
  })

  ;(map as maplibre.Map).on('click', 'prefectures-fill', (e) => {
    if (!e.features?.[0]) return
    const area = extractAreaFromFeature(e.features[0], 'prefecture')
    if (area) onAreaSelect(area)
  })

  ;(map as maplibre.Map).on('mouseenter', 'prefectures-fill', () => {
    ;(map as maplibre.Map).getCanvas().style.cursor = 'pointer'
  })

  ;(map as maplibre.Map).on('mouseleave', 'prefectures-fill', () => {
    ;(map as maplibre.Map).getCanvas().style.cursor = ''
  })
}
```

また、import文に追加:
```typescript
import { extractAreaFromFeature, PREFECTURE_GEOJSON_URL } from '@/lib/geojson/japan'
```

**Step 7: コミット**

```bash
git add src/ public/
git commit -m "feat: add Japan GeoJSON boundary data integration"
```

---

## Task 6: e-Stat API クライアント

**Files:**
- Create: `src/lib/estat/client.ts`
- Create: `src/lib/estat/client.test.ts`
- Create: `src/lib/estat/categories.ts`

**Step 1: e-Stat APIクライアントのテストを書く**

```typescript
// src/lib/estat/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EStatClient } from './client'

describe('EStatClient', () => {
  let client: EStatClient

  beforeEach(() => {
    client = new EStatClient('test-api-key')
  })

  it('constructs correct URL for getStatsData', () => {
    const url = client.buildStatsDataUrl('0003410379', '13113')
    expect(url).toContain('appId=test-api-key')
    expect(url).toContain('statsDataId=0003410379')
    expect(url).toContain('cdArea=13113')
  })

  it('throws error if API key is not set', () => {
    expect(() => new EStatClient('')).toThrow('e-Stat API key is required')
  })

  it('buildAreaCode pads municipality code to 5 digits', () => {
    const code = EStatClient.normalizeAreaCode('1310', 'municipality')
    expect(code).toBe('01310')
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run
# FAIL - EStatClient not found
```

**Step 3: e-Stat APIクライアントを実装**

```typescript
// src/lib/estat/client.ts

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
          '$': string // 値
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
```

**Step 4: 統計カテゴリ定義を作成（拡張可能設計）**

```typescript
// src/lib/estat/categories.ts
import type { StatisticsCategory } from '@/lib/types'

// LLMが listStatisticsCategories() で取得するカテゴリ一覧
// 新しいカテゴリを追加するだけでLLMが自動的に活用する
export const STATISTICS_CATEGORIES: StatisticsCategory[] = [
  {
    id: 'population',
    name: '人口統計',
    description: '国勢調査による人口・年齢構成・世帯数・人口密度などの情報',
    statsIds: ['0003410379'], // 国勢調査 市区町村別人口
  },
  {
    id: 'commerce',
    name: '商業統計',
    description: '小売業・卸売業の店舗数・売上高・従業者数などの商業情報',
    statsIds: ['0003146045'], // 商業統計調査
  },
  {
    id: 'economy',
    name: '経済センサス',
    description: '事業所数・従業員数・産業構造など経済活動の基本情報',
    statsIds: ['0003215767'], // 経済センサス
  },
]

export function getCategoryById(id: string): StatisticsCategory | undefined {
  return STATISTICS_CATEGORIES.find((c) => c.id === id)
}
```

**Step 5: テストを通すことを確認**

```bash
npm run test:run
# PASS src/lib/estat/client.test.ts
```

**Step 6: .env.local を作成**

```bash
# .env.local
ESTAT_API_KEY=your_api_key_here
# e-Stat APIキーは https://www.e-stat.go.jp/api/ から取得
```

```bash
# .gitignore に追加されていることを確認
grep ".env.local" .gitignore
```

**Step 7: コミット**

```bash
git add src/lib/estat/
git commit -m "feat: add e-Stat API client and statistics categories"
```

---

## Task 7: LLM Tool Calling（Vercel AI SDK）

**Files:**
- Create: `src/lib/llm/tools.ts`
- Create: `src/lib/llm/tools.test.ts`
- Create: `src/app/api/chat/route.ts`

**Step 1: LLMツールのテストを書く**

```typescript
// src/lib/llm/tools.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createStatisticsTools } from './tools'
import { STATISTICS_CATEGORIES } from '@/lib/estat/categories'

describe('createStatisticsTools', () => {
  it('returns listStatisticsCategories tool', () => {
    const tools = createStatisticsTools('test-key')
    expect(tools.listStatisticsCategories).toBeDefined()
  })

  it('returns fetchStatistics tool', () => {
    const tools = createStatisticsTools('test-key')
    expect(tools.fetchStatistics).toBeDefined()
  })

  it('listStatisticsCategories returns all categories', async () => {
    const tools = createStatisticsTools('test-key')
    const result = await tools.listStatisticsCategories.execute({})
    expect(result.categories).toHaveLength(STATISTICS_CATEGORIES.length)
    expect(result.categories[0]).toHaveProperty('id')
    expect(result.categories[0]).toHaveProperty('description')
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run
# FAIL
```

**Step 3: LLMツールを実装**

```typescript
// src/lib/llm/tools.ts
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
      execute: async ({ categoryId, areaCode, prefCode }) => {
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
        // 初期実装: 基本情報のみ返す（将来的にDBや外部APIから取得）
        return {
          areaCode,
          areaName,
          note: '詳細な面積・隣接情報は今後のアップデートで追加予定です。',
        }
      },
    }),
  }
}
```

**Step 4: テストを通すことを確認**

```bash
npm run test:run
# PASS src/lib/llm/tools.test.ts
```

**Step 5: Chat APIルートを作成**

```typescript
// src/app/api/chat/route.ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createStatisticsTools } from '@/lib/llm/tools'
import type { SelectedArea } from '@/lib/types'

function getLLMModel() {
  const provider = process.env.LLM_PROVIDER ?? 'openai'
  const modelName = process.env.LLM_MODEL ?? 'gpt-4o'

  if (provider === 'anthropic') {
    return anthropic(process.env.LLM_MODEL ?? 'claude-sonnet-4-6')
  }
  return openai(modelName)
}

export async function POST(req: Request) {
  const { messages, selectedArea } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>
    selectedArea?: SelectedArea
  }

  const estatApiKey = process.env.ESTAT_API_KEY
  if (!estatApiKey) {
    return Response.json({ error: 'ESTAT_API_KEY is not configured' }, { status: 500 })
  }

  const areaContext = selectedArea
    ? `選択中のエリア: ${selectedArea.name} (コード: ${selectedArea.code}, 都道府県コード: ${selectedArea.prefCode})`
    : '特定のエリアは選択されていません。ユーザーに地図でエリアを選択するよう案内してください。'

  const tools = createStatisticsTools(estatApiKey)

  const result = streamText({
    model: getLLMModel(),
    system: `あなたは日本の統計データを専門とするアシスタントです。
e-Stat（政府統計ポータル）のデータを使用して、ユーザーの質問に回答します。
必要に応じてツールを呼び出してデータを取得してください。

${areaContext}

回答は日本語で、分かりやすく具体的に提供してください。
データが古い場合や取得できない場合は、その旨を明示してください。`,
    messages: messages as Array<{ role: 'user' | 'assistant'; content: string }>,
    tools,
    maxSteps: 5, // 複数のtool callを許可
  })

  return result.toDataStreamResponse()
}
```

**Step 6: コミット**

```bash
git add src/lib/llm/ src/app/api/
git commit -m "feat: add LLM tool calling with Vercel AI SDK and e-Stat integration"
```

---

## Task 8: チャットUIコンポーネント

**Files:**
- Create: `src/components/chat/ChatPanel.tsx`
- Create: `src/components/chat/ChatPanel.test.tsx`
- Create: `src/components/chat/MessageList.tsx`
- Create: `src/components/chat/ChatInput.tsx`

**Step 1: ChatPanel のテストを書く**

```typescript
// src/components/chat/ChatPanel.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatPanel } from './ChatPanel'

// Vercel AI SDKのuseChat をモック
vi.mock('ai/react', () => ({
  useChat: vi.fn().mockReturnValue({
    messages: [],
    input: '',
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    setMessages: vi.fn(),
  }),
}))

describe('ChatPanel', () => {
  it('renders chat input', () => {
    render(<ChatPanel selectedArea={null} />)
    expect(screen.getByPlaceholderText(/メッセージを入力/)).toBeInTheDocument()
  })

  it('renders send button', () => {
    render(<ChatPanel selectedArea={null} />)
    expect(screen.getByRole('button', { name: /送信/ })).toBeInTheDocument()
  })

  it('shows selected area context when area is selected', () => {
    render(
      <ChatPanel
        selectedArea={{
          name: '渋谷区',
          code: '13113',
          prefCode: '13',
          level: 'municipality',
        }}
      />
    )
    expect(screen.getByText(/渋谷区/)).toBeInTheDocument()
  })

  it('shows placeholder message when no messages', () => {
    render(<ChatPanel selectedArea={null} />)
    expect(screen.getByText(/地図でエリアを選択/)).toBeInTheDocument()
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run
# FAIL
```

**Step 3: MessageList を実装**

```typescript
// src/components/chat/MessageList.tsx
import type { Message } from 'ai'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm px-6 text-center">
        <p>地図でエリアを選択して、統計情報について質問してみましょう。<br />例: 「この地域の人口構成を教えて」</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-100 text-zinc-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
```

**Step 4: ChatInput を実装**

```typescript
// src/components/chat/ChatInput.tsx
import { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'

interface ChatInputProps {
  input: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}

export function ChatInput({ input, onChange, onSubmit, isLoading }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2 p-4 border-t">
      <Input
        value={input}
        onChange={onChange}
        placeholder="メッセージを入力..."
        disabled={isLoading}
        className="flex-1"
      />
      <Button type="submit" disabled={isLoading || !input.trim()} aria-label="送信">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
```

**Step 5: ChatPanel を実装**

```typescript
// src/components/chat/ChatPanel.tsx
'use client'

import { useChat } from 'ai/react'
import type { SelectedArea } from '@/lib/types'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

interface ChatPanelProps {
  selectedArea: SelectedArea | null
}

export function ChatPanel({ selectedArea }: ChatPanelProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { selectedArea },
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-white">
        <h1 className="font-semibold text-sm text-zinc-900">ChatJapan</h1>
        {selectedArea && (
          <p className="text-xs text-zinc-500 mt-0.5">
            🗾 {selectedArea.name}
          </p>
        )}
      </div>

      <MessageList messages={messages} />

      <ChatInput
        input={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
```

**Step 6: テストを通すことを確認**

```bash
npm run test:run
# PASS src/components/chat/ChatPanel.test.tsx
```

**Step 7: page.tsx を最終形に更新**

```typescript
// src/app/page.tsx
'use client'

import { SplitLayout } from '@/components/layout/SplitLayout'
import { MapPanel } from '@/components/map/MapPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useMapSelection } from '@/hooks/useMapSelection'

export default function Home() {
  const { selectedArea, selectArea, clearSelection } = useMapSelection()

  return (
    <SplitLayout
      left={
        <MapPanel
          selectedArea={selectedArea}
          onAreaSelect={selectArea}
          onAreaClear={clearSelection}
        />
      }
      right={<ChatPanel selectedArea={selectedArea} />}
    />
  )
}
```

**Step 8: 全テストを実行して通ることを確認**

```bash
npm run test:run
# PASS all tests
```

**Step 9: コミット**

```bash
git add src/components/chat/ src/app/page.tsx
git commit -m "feat: add chat UI with streaming LLM responses"
```

---

## Task 9: Vercel デプロイ設定

**Files:**
- Create: `.env.local` (gitignore済み)
- Create: `vercel.json`

**Step 1: 環境変数を確認**

```bash
# .env.local に以下が設定されていることを確認
# ESTAT_API_KEY=xxx        (https://www.e-stat.go.jp/api/ から取得)
# OPENAI_API_KEY=xxx       または
# ANTHROPIC_API_KEY=xxx
# LLM_PROVIDER=openai      または anthropic
# LLM_MODEL=gpt-4o         または claude-sonnet-4-6
```

**Step 2: vercel.json を作成**

```json
{
  "framework": "nextjs",
  "regions": ["nrt1"],
  "env": {
    "ESTAT_API_KEY": "@estat-api-key",
    "OPENAI_API_KEY": "@openai-api-key",
    "LLM_PROVIDER": "openai",
    "LLM_MODEL": "gpt-4o"
  }
}
```

**Step 3: ビルドが通ることを確認**

```bash
npm run build
# ✓ Compiled successfully
```

**Step 4: Vercel CLIでデプロイ**

```bash
npm install -g vercel
vercel login
vercel --prod

# Vercel ダッシュボードで環境変数を設定:
# ESTAT_API_KEY, OPENAI_API_KEY (または ANTHROPIC_API_KEY), LLM_PROVIDER, LLM_MODEL
```

**Step 5: コミット**

```bash
git add vercel.json
git commit -m "feat: add Vercel deployment configuration"
```

---

## Task 10: NextAuth.js 認証（任意ログイン）

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/auth.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/components/layout/Header.tsx`

**Step 1: NextAuth.js の設定**

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/',
  },
})
```

**Step 2: APIルートを作成**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

**Step 3: Header コンポーネントを作成**

```typescript
// src/components/layout/Header.tsx
'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="h-12 border-b flex items-center justify-between px-4 bg-white shrink-0">
      <span className="font-semibold text-sm">ChatJapan</span>
      <div className="flex items-center gap-2">
        {session ? (
          <>
            <span className="text-xs text-zinc-500">{session.user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              ログアウト
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => signIn('google')}>
            ログイン
          </Button>
        )}
      </div>
    </header>
  )
}
```

**Step 4: layout.tsx に SessionProvider と Header を追加**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChatJapan',
  description: '日本の統計情報を地図で探索するチャットサービス',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.className} overflow-hidden`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

**Step 5: 環境変数に追加**

```bash
# .env.local に追加
# AUTH_SECRET=xxx           (openssl rand -base64 32 で生成)
# GOOGLE_CLIENT_ID=xxx      (Google Cloud Console から)
# GOOGLE_CLIENT_SECRET=xxx
```

**Step 6: 全テストを実行して通ることを確認**

```bash
npm run test:run
# PASS all tests
```

**Step 7: コミット**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/components/layout/Header.tsx src/app/layout.tsx
git commit -m "feat: add optional Google login with NextAuth.js"
```

---

## 完了チェックリスト

- [ ] `npm run test:run` が全テスト PASS
- [ ] `npm run build` がエラーなく完了
- [ ] `npm run dev` でスプリットスクリーンのUI表示
- [ ] 地図で都道府県をクリックしてエリア選択が動作
- [ ] チャットでエリアに関する質問に回答できる
- [ ] Vercel にデプロイ済み
- [ ] Googleログインが動作（ログインなしでも利用可能）

---

## 次のステップ（Phase 5以降）

- 市区町村レベルへのドリルダウン（都道府県クリック → 市区町村表示）
- 統計カテゴリの拡張（10+ カテゴリ）
- 会話履歴のDB保存（Vercel Postgres + Prisma）
- モバイル対応（ボトムシート地図）
- AWS移行検討（Lambda vs ECS、Bedrock検討）
