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
