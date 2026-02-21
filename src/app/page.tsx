'use client'

import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout'
import { MapPanel } from '@/components/map/MapPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useMapSelection } from '@/hooks/useMapSelection'

export default function Home() {
  const {
    selectedArea,
    selectionMode,
    focusedPrefecture,
    selectArea,
    clearSelection,
    enterMunicipalityMode,
    exitMunicipalityMode,
  } = useMapSelection()

  return (
    <ThreeColumnLayout
      center={
        <MapPanel
          selectedArea={selectedArea}
          onAreaSelect={selectArea}
          selectionMode={selectionMode}
          focusedPrefecture={focusedPrefecture}
          onEnterMunicipalityMode={enterMunicipalityMode}
          onExitMunicipalityMode={exitMunicipalityMode}
        />
      }
      right={<ChatPanel selectedArea={selectedArea} onAreaClear={clearSelection} />}
    />
  )
}
