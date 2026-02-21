# 市区町村ドリルダウン Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 都道府県クリック時に市区町村レベルの地図・統計情報へドリルダウンできる機能を追加する。

**Architecture:** e-Stat GIS APIプロキシ用Next.jsルートを作成し、Vercel KVでGeoJSONをキャッシュ。`useMapSelection`フックを拡張して`viewLevel`・`focusedPrefecture`・`drillDown`・`drillUp`を追加。MapPanelに市区町村レイヤーと「戻る」ボタンを追加。

**Tech Stack:** Next.js 16 App Router, TypeScript, MapLibre GL JS 5, @vercel/kv, Vitest + Testing Library

---

## Task 1: @vercel/kv インストール + e-Stat GIS API クライアント

**Files:**
- Create: `src/lib/geojson/estat-gis.ts`
- Create: `src/lib/geojson/estat-gis.test.ts`

### Step 1: @vercel/kv をインストール

```bash
npm install @vercel/kv
```

Expected: `package.json` の `dependencies` に `@vercel/kv` が追加される。

### Step 2: テストを書く

```typescript
// src/lib/geojson/estat-gis.test.ts
import { describe, it, expect } from 'vitest'
import { EStatGisClient } from './estat-gis'

describe('EStatGisClient', () => {
  it('builds correct municipality GeoJSON URL', () => {
    const client = new EStatGisClient('test-key')
    const url = client.buildMunicipalityUrl('13')
    expect(url).toContain('appId=test-key')
    expect(url).toContain('regionCode=13')
    expect(url).toContain('geometryType=1')
    expect(url).toContain('format=geojson')
  })

  it('throws if API key is empty', () => {
    expect(() => new EStatGisClient('')).toThrow('e-Stat GIS API key is required')
  })

  it('generates correct cache key', () => {
    const key = EStatGisClient.cacheKey('13')
    expect(key).toBe('geojson:municipality:13')
  })

  it('normalizes 1-digit prefCode to 2 digits', () => {
    const client = new EStatGisClient('test-key')
    const url = client.buildMunicipalityUrl('1')
    expect(url).toContain('regionCode=01')
  })
})
```

### Step 3: テストが FAIL することを確認

```bash
npm run test:run -- src/lib/geojson/estat-gis.test.ts
```

Expected: `FAIL` — `EStatGisClient not found`

### Step 4: 実装を書く

```typescript
// src/lib/geojson/estat-gis.ts

const ESTAT_GIS_BASE = 'https://www.e-stat.go.jp/api/v3/statmap/boundary'

export class EStatGisClient {
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('e-Stat GIS API key is required')
    this.apiKey = apiKey
  }

  buildMunicipalityUrl(prefCode: string): string {
    const normalized = prefCode.padStart(2, '0')
    const params = new URLSearchParams({
      appId: this.apiKey,
      regionCode: normalized,
      year: '2020',
      geometryType: '1',
      format: 'geojson',
    })
    return `${ESTAT_GIS_BASE}?${params.toString()}`
  }

  async fetchMunicipalityGeoJson(prefCode: string): Promise<GeoJSON.FeatureCollection> {
    const url = this.buildMunicipalityUrl(prefCode)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`e-Stat GIS API error: ${res.status}`)
    return res.json()
  }

  static cacheKey(prefCode: string): string {
    return `geojson:municipality:${prefCode}`
  }
}
```

### Step 5: テストが PASS することを確認

```bash
npm run test:run -- src/lib/geojson/estat-gis.test.ts
```

Expected: `PASS`

### Step 6: 全テストが壊れていないことを確認

```bash
npm run test:run
```

Expected: 全件 PASS（既存テスト含む）

### Step 7: コミット

```bash
git add src/lib/geojson/estat-gis.ts src/lib/geojson/estat-gis.test.ts package.json package-lock.json
git commit -m "feat: add EStatGisClient for municipality GeoJSON"
```

---

## Task 2: useMapSelection フック拡張

**Files:**
- Modify: `src/hooks/useMapSelection.ts`
- Modify: `src/hooks/useMapSelection.test.ts`

### Step 1: 新しいテストケースを追加

既存の `src/hooks/useMapSelection.test.ts` を開き、ファイル末尾の `})` の直前に以下のテストを追加する:

```typescript
  describe('drill-down', () => {
    it('starts at prefecture view level', () => {
      const { result } = renderHook(() => useMapSelection())
      expect(result.current.viewLevel).toBe('prefecture')
      expect(result.current.focusedPrefecture).toBeNull()
    })

    it('drillDown sets viewLevel to municipality and focusedPrefecture', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.drillDown({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
      })
      expect(result.current.viewLevel).toBe('municipality')
      expect(result.current.focusedPrefecture?.name).toBe('東京都')
    })

    it('drillDown clears selectedArea', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.selectArea({
          name: '渋谷区',
          code: '13113',
          prefCode: '13',
          level: 'municipality',
        })
        result.current.drillDown({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
      })
      expect(result.current.selectedArea).toBeNull()
    })

    it('drillUp resets viewLevel and focusedPrefecture', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.drillDown({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
        result.current.drillUp()
      })
      expect(result.current.viewLevel).toBe('prefecture')
      expect(result.current.focusedPrefecture).toBeNull()
    })

    it('drillUp also clears selectedArea', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.drillDown({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
        result.current.selectArea({
          name: '渋谷区',
          code: '13113',
          prefCode: '13',
          level: 'municipality',
        })
        result.current.drillUp()
      })
      expect(result.current.selectedArea).toBeNull()
    })
  })
```

### Step 2: テストが FAIL することを確認

```bash
npm run test:run -- src/hooks/useMapSelection.test.ts
```

Expected: `FAIL` — `drillDown is not a function` など

### Step 3: useMapSelection を更新

`src/hooks/useMapSelection.ts` を以下の内容で置き換える:

```typescript
import { useState } from 'react'
import type { SelectedArea } from '@/lib/types'

export type ViewLevel = 'prefecture' | 'municipality'

export function useMapSelection() {
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null)
  const [viewLevel, setViewLevel] = useState<ViewLevel>('prefecture')
  const [focusedPrefecture, setFocusedPrefecture] = useState<SelectedArea | null>(null)

  const selectArea = (area: SelectedArea) => {
    setSelectedArea(area)
  }

  const clearSelection = () => {
    setSelectedArea(null)
  }

  const drillDown = (prefecture: SelectedArea) => {
    setFocusedPrefecture(prefecture)
    setViewLevel('municipality')
    setSelectedArea(null)
  }

  const drillUp = () => {
    setFocusedPrefecture(null)
    setViewLevel('prefecture')
    setSelectedArea(null)
  }

  return {
    selectedArea,
    viewLevel,
    focusedPrefecture,
    selectArea,
    clearSelection,
    drillDown,
    drillUp,
  }
}
```

### Step 4: テストが PASS することを確認

```bash
npm run test:run -- src/hooks/useMapSelection.test.ts
```

Expected: `PASS` — 全 8 テスト

### Step 5: 全テストが壊れていないことを確認

```bash
npm run test:run
```

Expected: 全件 PASS

### Step 6: コミット

```bash
git add src/hooks/useMapSelection.ts src/hooks/useMapSelection.test.ts
git commit -m "feat: extend useMapSelection with drill-down state"
```

---

## Task 3: /api/geojson/[prefCode] APIルート

**Files:**
- Create: `src/app/api/geojson/[prefCode]/route.ts`

> **注意:** このルートは外部APIとKVを使うためユニットテスト対象外。実装後に `curl` で動作確認する。

### Step 1: ディレクトリを作成して route.ts を書く

```typescript
// src/app/api/geojson/[prefCode]/route.ts
import { EStatGisClient } from '@/lib/geojson/estat-gis'

// Vercel KV は環境変数が設定されている場合のみ使う
async function tryKvGet(key: string): Promise<string | null> {
  try {
    const { kv } = await import('@vercel/kv')
    return await kv.get<string>(key)
  } catch {
    return null
  }
}

async function tryKvSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv')
    await kv.set(key, value, { ex: ttlSeconds })
  } catch {
    // KV not configured (local dev), skip
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ prefCode: string }> }
) {
  const { prefCode } = await params

  if (!/^\d{1,2}$/.test(prefCode)) {
    return Response.json({ error: 'Invalid prefCode' }, { status: 400 })
  }

  const cacheKey = EStatGisClient.cacheKey(prefCode)

  // KVキャッシュを確認
  const cached = await tryKvGet(cacheKey)
  if (cached) {
    return new Response(cached, {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // e-Stat GIS API から取得
  const apiKey = process.env.ESTAT_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ESTAT_API_KEY is not configured' }, { status: 500 })
  }

  try {
    const client = new EStatGisClient(apiKey)
    const geojson = await client.fetchMunicipalityGeoJson(prefCode)
    const body = JSON.stringify(geojson)

    // 30日キャッシュ（境界データは変わらない）
    await tryKvSet(cacheKey, body, 30 * 24 * 60 * 60)

    return new Response(body, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return Response.json(
      { error: `Failed to fetch municipality data: ${String(err)}` },
      { status: 502 }
    )
  }
}
```

### Step 2: ビルドが通ることを確認

```bash
npm run build
```

Expected: `✓ Compiled successfully`（またはエラーなし）

### Step 3: 開発サーバーで動作確認

```bash
npm run dev
# 別ターミナルで
curl "http://localhost:3000/api/geojson/13"
```

Expected: GeoJSON レスポンス（e-Stat API キーが設定されていれば）、または `{"error":"ESTAT_API_KEY is not configured"}`

### Step 4: コミット

```bash
git add src/app/api/geojson/
git commit -m "feat: add /api/geojson/[prefCode] route with KV cache"
```

---

## Task 4: MapPanel 更新 + page.tsx 配線

**Files:**
- Modify: `src/components/map/MapPanel.tsx`
- Modify: `src/components/map/MapPanel.test.tsx`
- Modify: `src/app/page.tsx`

### Step 1: MapPanel.test.tsx にドリルダウンUIテストを追加

`src/components/map/MapPanel.test.tsx` を開き、まずモックに新しいメソッドを追加する。

既存の `vi.mock('maplibre-gl', ...)` ブロックを以下に置き換える:

```typescript
vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      once: vi.fn().mockImplementation((event: string, cb: () => void) => {
        if (event === 'load') cb()
      }),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      getLayer: vi.fn().mockReturnValue(null),
      getSource: vi.fn().mockReturnValue(null),
      setFeatureState: vi.fn(),
      getFeatureState: vi.fn(),
      getCanvas: vi.fn().mockReturnValue({ style: {} }),
      flyTo: vi.fn(),
    })),
    supported: vi.fn().mockReturnValue(true),
  },
}))
```

次に、既存テストの後に以下を追加する:

```typescript
  it('shows back button when viewLevel is municipality', () => {
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={vi.fn()}
        viewLevel="municipality"
        focusedPrefecture={{
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        }}
        onDrillDown={vi.fn()}
        onDrillUp={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /都道府県に戻る/ })).toBeInTheDocument()
    expect(screen.getByText(/東京都/)).toBeInTheDocument()
  })

  it('does not show back button when viewLevel is prefecture', () => {
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={vi.fn()}
        viewLevel="prefecture"
        focusedPrefecture={null}
        onDrillDown={vi.fn()}
        onDrillUp={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /都道府県に戻る/ })).not.toBeInTheDocument()
  })

  it('calls onDrillUp when back button is clicked', async () => {
    const onDrillUp = vi.fn()
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={vi.fn()}
        viewLevel="municipality"
        focusedPrefecture={{
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        }}
        onDrillDown={vi.fn()}
        onDrillUp={onDrillUp}
      />
    )
    const backButton = screen.getByRole('button', { name: /都道府県に戻る/ })
    backButton.click()
    expect(onDrillUp).toHaveBeenCalledTimes(1)
  })
```

> **注意:** 既存の3テストも `viewLevel="prefecture"`, `focusedPrefecture={null}`, `onDrillDown={vi.fn()}`, `onDrillUp={vi.fn()}` を props に追加する必要がある（後で型エラーになる）。

### Step 2: テストが FAIL することを確認

```bash
npm run test:run -- src/components/map/MapPanel.test.tsx
```

Expected: `FAIL` — 型エラーまたは `onDrillDown` が存在しない

### Step 3: MapPanel.tsx を更新

`src/components/map/MapPanel.tsx` を以下の内容で置き換える:

```typescript
'use client'

import { useEffect, useRef } from 'react'
import type { SelectedArea } from '@/lib/types'
import type { ViewLevel } from '@/hooks/useMapSelection'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft } from 'lucide-react'
import { extractAreaFromFeature, PREFECTURE_GEOJSON_URL } from '@/lib/geojson/japan'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapPanelProps {
  selectedArea: SelectedArea | null
  onAreaSelect: (area: SelectedArea) => void
  onAreaClear?: () => void
  viewLevel: ViewLevel
  focusedPrefecture: SelectedArea | null
  onDrillDown: (area: SelectedArea) => void
  onDrillUp: () => void
}

export function MapPanel({
  selectedArea,
  onAreaSelect,
  onAreaClear,
  viewLevel,
  focusedPrefecture,
  onDrillDown,
  onDrillUp,
}: MapPanelProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const onAreaSelectRef = useRef(onAreaSelect)
  const onDrillDownRef = useRef(onDrillDown)

  useEffect(() => {
    onAreaSelectRef.current = onAreaSelect
  }, [onAreaSelect])

  useEffect(() => {
    onDrillDownRef.current = onDrillDown
  }, [onDrillDown])

  // 市区町村レイヤーの追加・削除
  useEffect(() => {
    const map = mapRef.current as {
      addSource: (id: string, src: unknown) => void
      addLayer: (layer: unknown) => void
      removeLayer: (id: string) => void
      removeSource: (id: string) => void
      getLayer: (id: string) => unknown
      getSource: (id: string) => unknown
      flyTo: (options: unknown) => void
      on: (event: string, layer: string, cb: (e: unknown) => void) => void
      getCanvas: () => { style: { cursor: string } }
    } | null

    if (!map) return

    const MUNI_SOURCE = 'municipalities'
    const MUNI_FILL = 'municipalities-fill'
    const MUNI_OUTLINE = 'municipalities-outline'

    if (viewLevel === 'municipality' && focusedPrefecture) {
      // 市区町村GeoJSONを取得してレイヤー追加
      fetch(`/api/geojson/${focusedPrefecture.prefCode}`)
        .then((r) => r.json())
        .then((geojson) => {
          if (map.getSource(MUNI_SOURCE)) return // 既に追加済み

          map.addSource(MUNI_SOURCE, { type: 'geojson', data: geojson })

          map.addLayer({
            id: MUNI_FILL,
            type: 'fill',
            source: MUNI_SOURCE,
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                0.4,
                0.05,
              ],
            },
          })

          map.addLayer({
            id: MUNI_OUTLINE,
            type: 'line',
            source: MUNI_SOURCE,
            paint: { 'line-color': '#059669', 'line-width': 1 },
          })

          map.on('click', MUNI_FILL, (e: unknown) => {
            const ev = e as { features?: GeoJSON.Feature[] }
            if (!ev.features?.[0]) return
            const area = extractAreaFromFeature(ev.features[0], 'municipality')
            if (area) onAreaSelectRef.current(area)
          })

          map.on('mouseenter', MUNI_FILL, () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', MUNI_FILL, () => {
            map.getCanvas().style.cursor = ''
          })

          // 都道府県にズームイン
          map.flyTo({ zoom: 8 })
        })
        .catch(() => {
          // フェッチ失敗は無視（UIエラー表示は将来的に追加）
        })
    } else {
      // 市区町村レイヤーを削除してズームアウト
      if (map.getLayer(MUNI_FILL)) map.removeLayer(MUNI_FILL)
      if (map.getLayer(MUNI_OUTLINE)) map.removeLayer(MUNI_OUTLINE)
      if (map.getSource(MUNI_SOURCE)) map.removeSource(MUNI_SOURCE)
      map.flyTo({ zoom: 5, center: [137.0, 36.5] })
    }
  }, [viewLevel, focusedPrefecture])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const initMap = async () => {
      try {
        const maplibre = (await import('maplibre-gl')).default

        const map = new maplibre.Map({
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
            layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm-tiles' }],
          },
          center: [137.0, 36.5],
          zoom: 5,
        })

        mapRef.current = map

        await new Promise<void>((resolve) => map.once('load', resolve))

        const response = await fetch(PREFECTURE_GEOJSON_URL)
        if (response.ok) {
          const geojson = await response.json()

          map.addSource('prefectures', { type: 'geojson', data: geojson })

          map.addLayer({
            id: 'prefectures-fill',
            type: 'fill',
            source: 'prefectures',
            paint: {
              'fill-color': '#3b82f6',
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                0.3,
                0,
              ],
            },
          })

          map.addLayer({
            id: 'prefectures-outline',
            type: 'line',
            source: 'prefectures',
            paint: { 'line-color': '#6b7280', 'line-width': 1 },
          })

          // 都道府県クリック → ドリルダウン
          map.on('click', 'prefectures-fill', (e) => {
            if (!e.features?.[0]) return
            const area = extractAreaFromFeature(
              e.features[0] as unknown as GeoJSON.Feature,
              'prefecture'
            )
            if (area) onDrillDownRef.current(area)
          })

          map.on('mouseenter', 'prefectures-fill', () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', 'prefectures-fill', () => {
            map.getCanvas().style.cursor = ''
          })
        }
      } catch {
        // WebGL未対応など
      }
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
      {/* ドリルダウン中: 戻るボタン + 都道府県名 */}
      {viewLevel === 'municipality' && focusedPrefecture && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 text-sm font-medium">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDrillUp}
            className="h-6 px-2 gap-1"
            aria-label="都道府県に戻る"
          >
            <ChevronLeft className="h-3 w-3" />
            都道府県に戻る
          </Button>
          <span className="text-zinc-400">|</span>
          <span>{focusedPrefecture.name}</span>
        </div>
      )}

      {/* 市区町村選択中: 選択エリア名 + 解除ボタン */}
      {selectedArea && viewLevel === 'municipality' && (
        <div className="absolute top-14 left-3 z-10 flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 text-sm font-medium">
          <span>{selectedArea.name}を選択中</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAreaClear}
            className="h-5 w-5 p-0"
            aria-label="選択解除"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* 都道府県レベルで選択中（後方互換） */}
      {selectedArea && viewLevel === 'prefecture' && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 text-sm font-medium">
          <span>{selectedArea.name}を選択中</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAreaClear}
            className="h-5 w-5 p-0"
            aria-label="選択解除"
          >
            <X className="h-3 w-3" />
          </Button>
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

### Step 4: 既存テストの props を修正

`src/components/map/MapPanel.test.tsx` の既存3テスト（`renders the map container`、`shows selected area name when area is selected`、`shows clear button when area is selected`）で `<MapPanel />` を呼んでいる箇所に、以下の props を追加する:

```typescript
viewLevel="prefecture"
focusedPrefecture={null}
onDrillDown={vi.fn()}
onDrillUp={vi.fn()}
```

例（最初のテスト）:
```typescript
render(
  <MapPanel
    selectedArea={null}
    onAreaSelect={onSelect}
    viewLevel="prefecture"
    focusedPrefecture={null}
    onDrillDown={vi.fn()}
    onDrillUp={vi.fn()}
  />
)
```

### Step 5: テストが PASS することを確認

```bash
npm run test:run -- src/components/map/MapPanel.test.tsx
```

Expected: `PASS` — 全 6 テスト

### Step 6: page.tsx を更新して新しいフック戻り値を配線

`src/app/page.tsx` を以下に更新:

```typescript
'use client'

import { SplitLayout } from '@/components/layout/SplitLayout'
import { MapPanel } from '@/components/map/MapPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useMapSelection } from '@/hooks/useMapSelection'

export default function Home() {
  const {
    selectedArea,
    viewLevel,
    focusedPrefecture,
    selectArea,
    clearSelection,
    drillDown,
    drillUp,
  } = useMapSelection()

  return (
    <SplitLayout
      left={
        <MapPanel
          selectedArea={selectedArea}
          onAreaSelect={selectArea}
          onAreaClear={clearSelection}
          viewLevel={viewLevel}
          focusedPrefecture={focusedPrefecture}
          onDrillDown={drillDown}
          onDrillUp={drillUp}
        />
      }
      right={<ChatPanel selectedArea={selectedArea} />}
    />
  )
}
```

### Step 7: 全テストが PASS することを確認

```bash
npm run test:run
```

Expected: 全件 PASS

### Step 8: ビルドが通ることを確認

```bash
npm run build
```

Expected: `✓ Compiled successfully`

### Step 9: コミット

```bash
git add src/components/map/MapPanel.tsx src/components/map/MapPanel.test.tsx src/app/page.tsx
git commit -m "feat: add municipality drill-down to MapPanel"
```

---

## 完了チェックリスト

- [ ] `npm run test:run` が全件 PASS（新規テスト含む）
- [ ] `npm run build` がエラーなく完了
- [ ] `npm run dev` でドリルダウンUIが表示される
- [ ] 都道府県クリックで「都道府県に戻る」ボタンが表示される
- [ ] 市区町村をクリックすると右パネルのチャットに市区町村名が反映される
- [ ] 「都道府県に戻る」ボタンで都道府県レビューに戻る
