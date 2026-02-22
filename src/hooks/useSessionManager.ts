import { useCallback, useEffect, useState } from 'react'

interface SessionSummary {
  id: string
  title: string | null
  areaName: string | null
  createdAt: Date
}

export function useSessionManager(isLoggedIn: boolean) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async (): Promise<SessionSummary[] | null> => {
    if (!isLoggedIn) return null
    try {
      const res = await fetch('/api/sessions')
      if (!res.ok) return null
      const body = (await res.json()) as { sessions: SessionSummary[] }
      return body.sessions
    } catch {
      // ignore
      return null
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) return

    let cancelled = false

    const loadInitialSessions = async () => {
      const loadedSessions = await fetchSessions()
      if (cancelled || !loadedSessions) return
      setSessions(loadedSessions)
    }

    void loadInitialSessions()

    return () => {
      cancelled = true
    }
  }, [fetchSessions, isLoggedIn])

  const startNewSession = useCallback(() => {
    setCurrentSessionId(null)
  }, [])

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id)
  }, [])

  const handleSessionCreated = useCallback(
    (id: string) => {
      setCurrentSessionId(id)
      void fetchSessions().then((loadedSessions) => {
        if (!loadedSessions) return
        setSessions(loadedSessions)
      })
    },
    [fetchSessions]
  )

  const handleTitleGenerated = useCallback(() => {
    void fetchSessions().then((loadedSessions) => {
      if (!loadedSessions) return
      setSessions(loadedSessions)
    })
  }, [fetchSessions])

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
        setSessions((prev) => prev.filter((s) => s.id !== id))
        if (currentSessionId === id) setCurrentSessionId(null)
      } catch {
        // ignore
      }
    },
    [currentSessionId]
  )

  return {
    sessions,
    currentSessionId,
    startNewSession,
    selectSession,
    handleSessionCreated,
    handleTitleGenerated,
    deleteSession,
  }
}
