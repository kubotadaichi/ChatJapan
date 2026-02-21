'use client'

import { useEffect, useRef } from 'react'
import type { SelectedArea } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { extractAreaFromFeature, PREFECTURE_GEOJSON_URL } from '@/lib/geojson/japan'

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

    const initMap = async () => {
      const maplibre = (await import('maplibre-gl')).default
      await import('maplibre-gl/dist/maplibre-gl.css')

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
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
            },
          ],
        },
        center: [137.0, 36.5],
        zoom: 5,
      })

      mapRef.current = map

      const response = await fetch(PREFECTURE_GEOJSON_URL)
      if (response.ok) {
        const geojson = await response.json()

        map.on('load', () => {
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

          map.on('click', 'prefectures-fill', (e) => {
            if (!e.features?.[0]) return
            const area = extractAreaFromFeature(e.features[0] as unknown as GeoJSON.Feature, 'prefecture')
            if (area) onAreaSelect(area)
          })

          map.on('mouseenter', 'prefectures-fill', () => {
            map.getCanvas().style.cursor = 'pointer'
          })

          map.on('mouseleave', 'prefectures-fill', () => {
            map.getCanvas().style.cursor = ''
          })
        })
      }
    }

    initMap()

    return () => {
      if (mapRef.current) {
        ;(mapRef.current as { remove: () => void }).remove()
        mapRef.current = null
      }
    }
  }, [onAreaSelect])

  return (
    <div className="relative h-full">
      {selectedArea && (
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
