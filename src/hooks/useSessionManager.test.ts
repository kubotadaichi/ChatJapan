import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useSessionManager } from './useSessionManager'

const mockFetch = vi.fn()

describe('useSessionManager', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not fetch sessions when not logged in', () => {
    renderHook(() => useSessionManager(false))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches sessions when logged in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessions: [{ id: 's1', title: 'T1', areaName: null, createdAt: new Date() }],
      }),
    } as Response)

    const { result } = renderHook(() => useSessionManager(true))
    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
  })

  it('startNewSession clears currentSessionId', () => {
    const { result } = renderHook(() => useSessionManager(false))
    act(() => result.current.selectSession('s1'))
    expect(result.current.currentSessionId).toBe('s1')
    act(() => result.current.startNewSession())
    expect(result.current.currentSessionId).toBeNull()
  })
})
