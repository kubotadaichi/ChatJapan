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

  const fetchSessions = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const res = await fetch('/api/sessions')
      if (!res.ok) return
      const body = (await res.json()) as { sessions: SessionSummary[] }
      setSessions(body.sessions)
    } catch {
      // ignore
    }
  }, [isLoggedIn])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  const startNewSession = useCallback(() => {
    setCurrentSessionId(null)
  }, [])

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id)
  }, [])

  const handleSessionCreated = useCallback(
    (id: string) => {
      setCurrentSessionId(id)
      void fetchSessions()
    },
    [fetchSessions]
  )

  const handleTitleGenerated = useCallback(() => {
    void fetchSessions()
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
