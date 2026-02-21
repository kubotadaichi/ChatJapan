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
