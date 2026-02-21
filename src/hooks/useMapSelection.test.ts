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

  describe('drill-down', () => {
    it('starts at prefecture view level', () => {
      const { result } = renderHook(() => useMapSelection())
      expect(result.current.viewLevel).toBe('prefecture')
      expect(result.current.focusedPrefecture).toBeNull()
    })

    it('drillDown sets viewLevel to municipality and focusedPrefecture', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.drillDown({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
      })
      expect(result.current.viewLevel).toBe('municipality')
      expect(result.current.focusedPrefecture?.name).toBe('東京都')
    })

    it('drillDown clears selectedArea', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.selectArea({
          name: '渋谷区',
          code: '13113',
          prefCode: '13',
          level: 'municipality',
        })
        result.current.drillDown({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
      })
      expect(result.current.selectedArea).toBeNull()
    })

    it('drillUp resets viewLevel and focusedPrefecture', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.drillDown({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
        result.current.drillUp()
      })
      expect(result.current.viewLevel).toBe('prefecture')
      expect(result.current.focusedPrefecture).toBeNull()
    })

    it('drillUp also clears selectedArea', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.drillDown({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
        result.current.selectArea({
          name: '渋谷区',
          code: '13113',
          prefCode: '13',
          level: 'municipality',
        })
        result.current.drillUp()
      })
      expect(result.current.selectedArea).toBeNull()
    })
  })
})
