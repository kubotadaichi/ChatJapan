import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useMapSelection } from './useMapSelection'

describe('useMapSelection', () => {
  it('starts with no selection', () => {
    const { result } = renderHook(() => useMapSelection())
    expect(result.current.selectedAreas).toHaveLength(0)
  })

  it('selects an area', () => {
    const { result } = renderHook(() => useMapSelection())
    const area = {
      name: '東京都',
      code: '13',
      prefCode: '13',
      level: 'prefecture' as const,
    }

    act(() => {
      result.current.selectArea(area)
    })

    expect(result.current.selectedAreas).toHaveLength(1)
    expect(result.current.selectedAreas[0]).toEqual(area)
  })

  it('clears selection', () => {
    const { result } = renderHook(() => useMapSelection())
    act(() => {
      result.current.selectArea({
        name: '東京都',
        code: '13',
        prefCode: '13',
        level: 'prefecture',
      })
      result.current.clearSelection()
    })
    expect(result.current.selectedAreas).toHaveLength(0)
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
        result.current.enterMunicipalityMode({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
      })
      expect(result.current.selectionMode).toBe('municipality')
      expect(result.current.focusedPrefecture?.name).toBe('東京都')
    })

    it('enterMunicipalityMode clears selectedAreas', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.selectArea({
          name: '渋谷区',
          code: '13113',
          prefCode: '13',
          level: 'municipality',
        })
        result.current.enterMunicipalityMode({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
      })
      expect(result.current.selectedAreas).toHaveLength(0)
    })

    it('exitMunicipalityMode returns to prefecture mode', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.enterMunicipalityMode({
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        })
        result.current.exitMunicipalityMode()
      })
      expect(result.current.selectionMode).toBe('prefecture')
      expect(result.current.focusedPrefecture).toBeNull()
    })

    it('exitMunicipalityMode clears selectedAreas', () => {
      const { result } = renderHook(() => useMapSelection())
      act(() => {
        result.current.enterMunicipalityMode({
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
        result.current.exitMunicipalityMode()
      })
      expect(result.current.selectedAreas).toHaveLength(0)
    })
  })

  describe('toggle deselect', () => {
    it('clicking same area twice deselects it', () => {
      const { result } = renderHook(() => useMapSelection())
      const area = { name: '東京都', code: '13', prefCode: '13', level: 'prefecture' as const }
      act(() => {
        result.current.selectArea(area)
      })
      expect(result.current.selectedAreas).toHaveLength(1)
      act(() => {
        result.current.selectArea(area)
      })
      expect(result.current.selectedAreas).toHaveLength(0)
    })

    it('clicking different areas keeps multiple selections', () => {
      const { result } = renderHook(() => useMapSelection())
      const area1 = { name: '東京都', code: '13', prefCode: '13', level: 'prefecture' as const }
      const area2 = { name: '大阪府', code: '27', prefCode: '27', level: 'prefecture' as const }
      act(() => {
        result.current.selectArea(area1)
      })
      act(() => {
        result.current.selectArea(area2)
      })
      expect(result.current.selectedAreas).toHaveLength(2)
      expect(result.current.selectedAreas).toEqual([area1, area2])
    })
  })
})
