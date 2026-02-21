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
