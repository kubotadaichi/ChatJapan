import { useState } from "react"
import type { SelectedArea } from "@/lib/types"

export function useMapSelection() {
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null)

  const selectArea = (area: SelectedArea) => {
    setSelectedArea(area)
  }

  const clearSelection = () => {
    setSelectedArea(null)
  }

  return { selectedArea, selectArea, clearSelection }
}
