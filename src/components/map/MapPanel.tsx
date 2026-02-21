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
  const prevSelectedAreaRef = useRef<SelectedArea | null>(null)

  useEffect(() => {
    onAreaSelectRef.current = onAreaSelect
  }, [onAreaSelect])

  useEffect(() => {
    onDrillDownRef.current = onDrillDown
  }, [onDrillDown])

  // 選択エリアのフィーチャーステート（ハイライト）
  useEffect(() => {
    const map = mapRef.current as {
      getSource: (id: string) => unknown
      setFeatureState: (feature: { source: string; id: string }, state: Record<string, boolean>) => void
    } | null
    if (!map) return

    const MUNI_SOURCE = 'municipalities'

    // 前の選択を解除
    if (prevSelectedAreaRef.current?.level === 'municipality') {
      if (map.getSource(MUNI_SOURCE)) {
        map.setFeatureState(
          { source: MUNI_SOURCE, id: prevSelectedAreaRef.current.code },
          { selected: false }
        )
      }
    }

    // 新しい選択をハイライト
    if (selectedArea?.level === 'municipality') {
      if (map.getSource(MUNI_SOURCE)) {
        map.setFeatureState(
          { source: MUNI_SOURCE, id: selectedArea.code },
          { selected: true }
        )
      }
    }

    prevSelectedAreaRef.current = selectedArea
  }, [selectedArea])

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

          map.addSource(MUNI_SOURCE, { type: 'geojson', data: geojson, promoteId: 'N03_007' })

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
