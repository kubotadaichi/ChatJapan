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
