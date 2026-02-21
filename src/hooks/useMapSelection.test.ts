import { renderHook, act } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useMapSelection } from "./useMapSelection"

describe("useMapSelection", () => {
  it("starts with no selection", () => {
    const { result } = renderHook(() => useMapSelection())
    expect(result.current.selectedArea).toBeNull()
  })

  it("selects an area", () => {
    const { result } = renderHook(() => useMapSelection())
    act(() => {
      result.current.selectArea({
        name: "東京都",
        code: "13",
        prefCode: "13",
        level: "prefecture",
      })
    })
    expect(result.current.selectedArea?.name).toBe("東京都")
    expect(result.current.selectedArea?.code).toBe("13")
  })

  it("clears selection", () => {
    const { result } = renderHook(() => useMapSelection())
    act(() => {
      result.current.selectArea({
        name: "東京都",
        code: "13",
        prefCode: "13",
        level: "prefecture",
      })
      result.current.clearSelection()
    })
    expect(result.current.selectedArea).toBeNull()
  })
})
