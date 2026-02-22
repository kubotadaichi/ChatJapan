'use client'

import { useEffect, useRef, useState } from 'react'
import type { SelectedArea } from '@/lib/types'
import type { SelectionMode } from '@/hooks/useMapSelection'
import { extractAreaFromFeature, PREFECTURE_GEOJSON_URL } from '@/lib/geojson/japan'
import 'maplibre-gl/dist/maplibre-gl.css'

interface ContextMenu {
  x: number
  y: number
  prefecture: SelectedArea | null
}

interface MapPanelProps {
  selectedAreas: SelectedArea[]
  onAreaSelect: (area: SelectedArea) => void
  selectionMode: SelectionMode
  focusedPrefecture: SelectedArea | null
  onEnterMunicipalityMode: (prefecture: SelectedArea) => void
  onExitMunicipalityMode: () => void
}

export function MapPanel({
  selectedAreas,
  onAreaSelect,
  selectionMode,
  focusedPrefecture,
  onEnterMunicipalityMode,
  onExitMunicipalityMode,
}: MapPanelProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const onAreaSelectRef = useRef(onAreaSelect)
  const selectedAreasRef = useRef(selectedAreas)
  const focusedPrefectureRef = useRef(focusedPrefecture)
  // selectionModeRef: イベントハンドラー内でstaleクロージャを防ぐ
  const selectionModeRef = useRef(selectionMode)
  const prevSelectedAreasRef = useRef<SelectedArea[]>([])

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)

  useEffect(() => {
    onAreaSelectRef.current = onAreaSelect
  }, [onAreaSelect])

  useEffect(() => {
    selectedAreasRef.current = selectedAreas
  }, [selectedAreas])

  useEffect(() => {
    focusedPrefectureRef.current = focusedPrefecture
  }, [focusedPrefecture])

  useEffect(() => {
    selectionModeRef.current = selectionMode
  }, [selectionMode])

  // 選択エリアのフィーチャーステート（ハイライト）
  useEffect(() => {
    const map = mapRef.current as {
      getSource: (id: string) => unknown
      setFeatureState: (
        feature: { source: string; id: string | number },
        state: Record<string, boolean>
      ) => void
    } | null
    if (!map) return

    const PREF_SOURCE = 'prefectures'
    const MUNI_SOURCE = 'municipalities'

    // 前の選択を解除
    prevSelectedAreasRef.current.forEach((prev) => {
      if (prev.level === 'prefecture') {
        if (map.getSource(PREF_SOURCE)) {
          map.setFeatureState(
            { source: PREF_SOURCE, id: Number(prev.code) },
            { selected: false }
          )
        }
      } else if (prev.level === 'municipality') {
        if (map.getSource(MUNI_SOURCE)) {
          map.setFeatureState(
            { source: MUNI_SOURCE, id: prev.code },
            { selected: false }
          )
        }
      }
    })

    // 新しい選択をハイライト
    selectedAreas.forEach((area) => {
      if (area.level === 'prefecture') {
        if (map.getSource(PREF_SOURCE)) {
          map.setFeatureState(
            { source: PREF_SOURCE, id: Number(area.code) },
            { selected: true }
          )
        }
      } else if (area.level === 'municipality') {
        if (map.getSource(MUNI_SOURCE)) {
          map.setFeatureState(
            { source: MUNI_SOURCE, id: area.code },
            { selected: true }
          )
        }
      }
    })

    prevSelectedAreasRef.current = selectedAreas
  }, [selectedAreas])

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

    if (selectionMode === 'municipality' && focusedPrefecture) {
      // 市区町村GeoJSONを取得してレイヤー追加
      fetch(`/api/geojson/${focusedPrefecture.prefCode}`)
        .then((r) => r.json())
        .then((geojson) => {
          if (map.getSource(MUNI_SOURCE)) return // 既に追加済み

          // promoteId: 'N03_007' でフィーチャーIDを設定（ハイライト用）
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
                0.5,
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

          // 市区町村 左クリック → 選択（トグル）
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
        })
        .catch(() => {
          // フェッチ失敗は無視
        })
    } else {
      // 市区町村レイヤーを削除してズームアウト
      if (map.getLayer(MUNI_FILL)) map.removeLayer(MUNI_FILL)
      if (map.getLayer(MUNI_OUTLINE)) map.removeLayer(MUNI_OUTLINE)
      if (map.getSource(MUNI_SOURCE)) map.removeSource(MUNI_SOURCE)
      map.flyTo({ zoom: 5, center: [137.0, 36.5] })
    }
  }, [selectionMode, focusedPrefecture])

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

          // promoteId: 'id' で dataofjapan/land の id プロパティをフィーチャーIDに使用
          map.addSource('prefectures', { type: 'geojson', data: geojson, promoteId: 'id' })

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

          // 都道府県 左クリック → 県を選択・ハイライト（市区町村モード中はスキップ）
          map.on('click', 'prefectures-fill', (e) => {
            if (selectionModeRef.current !== 'prefecture') return
            if (!e.features?.[0]) return
            const area = extractAreaFromFeature(
              e.features[0] as unknown as GeoJSON.Feature,
              'prefecture'
            )
            if (area) onAreaSelectRef.current(area)
          })

          map.on('mouseenter', 'prefectures-fill', () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', 'prefectures-fill', () => {
            map.getCanvas().style.cursor = ''
          })

          // 地図上のどこでも右クリックでモード変更メニューを開けるようにする
          map.on('contextmenu', (e) => {
            e.originalEvent.preventDefault()

            const rendered = map.queryRenderedFeatures(e.point, { layers: ['prefectures-fill'] })
            const clickedPrefecture =
              rendered[0]
                ? extractAreaFromFeature(
                    rendered[0] as unknown as GeoJSON.Feature,
                    'prefecture'
                  )
                : null

            const selectedPrefecture =
              selectedAreasRef.current.find((area) => area.level === 'prefecture') ?? null

            setContextMenu({
              x: e.point.x,
              y: e.point.y,
              prefecture: clickedPrefecture ?? selectedPrefecture ?? focusedPrefectureRef.current ?? null,
            })
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
    <div className="relative h-full" onClick={() => setContextMenu(null)}>
      {/* 市区町村モード中: 対象都道府県名を表示 */}
      {selectionMode === 'municipality' && focusedPrefecture && (
        <div className="absolute top-3 left-3 z-10 bg-card/90 rounded-lg shadow px-3 py-1.5 text-xs text-muted-foreground">
          {focusedPrefecture.name}の市区町村
        </div>
      )}

      {/* 操作ガイド */}
      {selectedAreas.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-card/90 rounded-lg shadow px-3 py-1.5 text-xs text-muted-foreground">
          {selectionMode === 'prefecture'
            ? '左クリック: 県を選択　右クリック: モード切り替え'
            : '左クリック: 市区町村を選択　右クリック: モード切り替え'}
        </div>
      )}

      {/* コンテキストメニュー */}
      {contextMenu && (
        <div
          className="absolute z-20 bg-card rounded-lg shadow-lg py-1 min-w-[200px] border border-border"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2 ${selectionMode === 'prefecture' ? 'font-medium' : ''}`}
            onClick={() => {
              if (selectionMode !== 'prefecture') {
                onExitMunicipalityMode()
              }
              setContextMenu(null)
            }}
          >
            <span className="w-4">{selectionMode === 'prefecture' ? '✓' : ''}</span>
            県選択モード
          </button>
          <button
            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
              selectionMode === 'municipality'
                ? 'font-medium'
                : contextMenu.prefecture
                  ? 'hover:bg-accent'
                  : 'opacity-50 cursor-not-allowed'
            }`}
            disabled={selectionMode === 'prefecture' && !contextMenu.prefecture}
            onClick={() => {
              if (selectionMode === 'prefecture' && contextMenu.prefecture) {
                onEnterMunicipalityMode(contextMenu.prefecture)
              }
              setContextMenu(null)
            }}
          >
            <span className="w-4">{selectionMode === 'municipality' ? '✓' : ''}</span>
            市区町村モード
          </button>
          <div className="border-t border-border my-1" />
          <button
            disabled
            className="w-full text-left px-4 py-2 text-sm opacity-50 cursor-not-allowed flex items-center gap-2"
          >
            <span className="w-4" />
            円周モード
            <span className="text-xs ml-auto text-muted-foreground">(準備中)</span>
          </button>
          <button
            disabled
            className="w-full text-left px-4 py-2 text-sm opacity-50 cursor-not-allowed flex items-center gap-2"
          >
            <span className="w-4" />
            矩形モード
            <span className="text-xs ml-auto text-muted-foreground">(準備中)</span>
          </button>
          <button
            disabled
            className="w-full text-left px-4 py-2 text-sm opacity-50 cursor-not-allowed flex items-center gap-2"
          >
            <span className="w-4" />
            複数選択
            <span className="text-xs ml-auto text-muted-foreground">(準備中)</span>
          </button>
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
