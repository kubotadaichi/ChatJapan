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

  describe('selection mode', () => {
    it('starts in prefecture mode', () => {
      const { result } = renderHook(() => useMapSelection())
      expect(result.current.selectionMode).toBe('prefecture')
      expect(result.current.focusedPrefecture).toBeNull()
    })

    it('enterMunicipalityMode switches mode and records prefecture', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.enterMunicipalityMode({ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' })
      })
      expect(result.current.selectionMode).toBe('municipality')
      expect(result.current.focusedPrefecture?.name).toBe('東京都')
    })

    it('enterMunicipalityMode clears selectedArea', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.selectArea({ name: '渋谷区', code: '13113', prefCode: '13', level: 'municipality' })
        result.current.enterMunicipalityMode({ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' })
      })
      expect(result.current.selectedArea).toBeNull()
    })

    it('exitMunicipalityMode returns to prefecture mode', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.enterMunicipalityMode({ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' })
        result.current.exitMunicipalityMode()
      })
      expect(result.current.selectionMode).toBe('prefecture')
      expect(result.current.focusedPrefecture).toBeNull()
    })

    it('exitMunicipalityMode clears selectedArea', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.enterMunicipalityMode({ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' })
        result.current.selectArea({ name: '渋谷区', code: '13113', prefCode: '13', level: 'municipality' })
        result.current.exitMunicipalityMode()
      })
      expect(result.current.selectedArea).toBeNull()
    })
  })

  describe('toggle deselect', () => {
    it('clicking same area twice deselects it', () => {
      const { result } = renderHook(() => useMapSelection())
      const area = { name: '東京都', code: '13', prefCode: '13', level: 'prefecture' as const }
      act(() => { result.current.selectArea(area) })
      expect(result.current.selectedArea?.code).toBe('13')
      act(() => { result.current.selectArea(area) })
      expect(result.current.selectedArea).toBeNull()
    })

    it('clicking different area changes selection', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.selectArea({ name: '東京都', code: '13', prefCode: '13', level: 'prefecture' })
      })
      act(() => {
        result.current.selectArea({ name: '大阪府', code: '27', prefCode: '27', level: 'prefecture' })
      })
      expect(result.current.selectedArea?.code).toBe('27')
    })
  })
})
