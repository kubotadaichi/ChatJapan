import { useState } from 'react'
import type { SelectedArea } from '@/lib/types'

export type SelectionMode = 'prefecture' | 'municipality'
// 将来のモード（UIには表示するが未実装）
export type SelectionModeAll = SelectionMode | 'circle' | 'rectangle' | 'multiple'

export function useMapSelection() {
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([])
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('prefecture')
  const [focusedPrefecture, setFocusedPrefecture] = useState<SelectedArea | null>(null)

  const selectArea = (area: SelectedArea) => {
    setSelectedAreas((prev) => {
      const idx = prev.findIndex((a) => a.code === area.code && a.level === area.level)
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx)
      }
      return [...prev, area]
    })
  }

  const clearSelection = () => {
    setSelectedAreas([])
  }

  // 市区町村モードに切り替え（対象都道府県を記録）
  const enterMunicipalityMode = (prefecture: SelectedArea) => {
    setFocusedPrefecture(prefecture)
    setSelectionMode('municipality')
    setSelectedAreas([])
  }

  // 県モードに戻る
  const exitMunicipalityMode = () => {
    setFocusedPrefecture(null)
    setSelectionMode('prefecture')
    setSelectedAreas([])
  }

  return {
    selectedAreas,
    selectionMode,
    focusedPrefecture,
    selectArea,
    clearSelection,
    enterMunicipalityMode,
    exitMunicipalityMode,
  }
}
