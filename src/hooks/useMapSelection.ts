import { useState } from 'react'
import type { SelectedArea } from '@/lib/types'

export type SelectionMode = 'prefecture' | 'municipality'
// 将来のモード（UIには表示するが未実装）
export type SelectionModeAll = SelectionMode | 'circle' | 'rectangle' | 'multiple'

export function useMapSelection() {
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('prefecture')
  const [focusedPrefecture, setFocusedPrefecture] = useState<SelectedArea | null>(null)

  const selectArea = (area: SelectedArea) => {
    // 同じエリアを再選択 → 解除（トグル）
    if (selectedArea?.code === area.code && selectedArea?.level === area.level) {
      setSelectedArea(null)
    } else {
      setSelectedArea(area)
    }
  }

  const clearSelection = () => {
    setSelectedArea(null)
  }

  // 市区町村モードに切り替え（対象都道府県を記録）
  const enterMunicipalityMode = (prefecture: SelectedArea) => {
    setFocusedPrefecture(prefecture)
    setSelectionMode('municipality')
    setSelectedArea(null)
  }

  // 県モードに戻る
  const exitMunicipalityMode = () => {
    setFocusedPrefecture(null)
    setSelectionMode('prefecture')
    setSelectedArea(null)
  }

  return {
    selectedArea,
    selectionMode,
    focusedPrefecture,
    selectArea,
    clearSelection,
    enterMunicipalityMode,
    exitMunicipalityMode,
  }
}
