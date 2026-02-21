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
