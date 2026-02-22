'use client'

import { useState, useRef, useMemo, FormEvent, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import type { SelectedArea } from '@/lib/types'
import type { AgentMode } from '@/lib/llm/prompts'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

interface ChatPanelProps {
  selectedAreas: SelectedArea[]
  onAreaClear: () => void
  onAreaRemove: (area: SelectedArea) => void
  onAreaAdd?: (area: SelectedArea) => void
  sessionId: string | null
  onSessionCreated: (id: string) => void
  onTitleGenerated: () => void
  isMapOpen?: boolean
  onToggleMap?: () => void
}

interface SessionMessagePayload {
  id: string
  role: string
  content: string
}

function extractTextContent(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => ('text' in p ? p.text : ''))
    .join('')
}

export function ChatPanel({
  selectedAreas,
  onAreaClear,
  onAreaRemove,
  onAreaAdd,
  sessionId,
  onSessionCreated,
  onTitleGenerated,
  isMapOpen = false,
  onToggleMap,
}: ChatPanelProps) {
  const selectedAreasRef = useRef(selectedAreas)
  selectedAreasRef.current = selectedAreas
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId
  const [agentMode, setAgentMode] = useState<AgentMode>('default')
  const agentModeRef = useRef(agentMode)
  agentModeRef.current = agentMode
  const processedToolInvocations = useRef<Set<string>>(new Set())
  const skipSessionLoadForIdRef = useRef<string | null>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ selectedAreas: selectedAreasRef.current, agentMode: agentModeRef.current }),
      }),
    []
  )

  const { messages, setMessages, sendMessage, status } = useChat({ transport })
  const [input, setInput] = useState('')
  const [isSubmitLocked, setIsSubmitLocked] = useState(false)
  const submitLockRef = useRef(false)
  const submitLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoading = status === 'submitted' || status === 'streaming'

  const prevStatus = useRef(status)
  const isSavingRef = useRef(false)

  useEffect(() => {
    const wasActive = prevStatus.current === 'submitted' || prevStatus.current === 'streaming'
    const isReady = status === 'ready'
    prevStatus.current = status

    if (!wasActive || !isReady) return
    if (isSavingRef.current) return

    const currentSessionId = sessionIdRef.current
    if (!currentSessionId) return
    if (messages.length < 2) return

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    const lastAiMsg = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!lastUserMsg || !lastAiMsg) return

    isSavingRef.current = true

    const area = selectedAreasRef.current[0] ?? null
    const messagesToSave = [
      {
        role: 'user',
        content: extractTextContent(lastUserMsg),
        areaCode: area?.code ?? null,
        areaName: area?.name ?? null,
      },
      {
        role: 'assistant',
        content: extractTextContent(lastAiMsg),
        areaCode: area?.code ?? null,
        areaName: area?.name ?? null,
      },
    ]

    fetch(`/api/sessions/${currentSessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messagesToSave }),
    })
      .then(() => {
        if (messages.filter((m) => m.role === 'assistant').length === 1) {
          return generateTitle(currentSessionId, messagesToSave[0].content, messagesToSave[1].content).then(
            onTitleGenerated
          )
        }
      })
      .finally(() => {
        isSavingRef.current = false
      })
  }, [messages, onTitleGenerated, status])

  useEffect(() => {
    return () => {
      if (submitLockTimerRef.current) {
        clearTimeout(submitLockTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const textToSend = input.trim()
    if (!textToSend) return
    if (isLoading || submitLockRef.current) return

    submitLockRef.current = true
    setIsSubmitLocked(true)
    if (submitLockTimerRef.current) {
      clearTimeout(submitLockTimerRef.current)
    }
    submitLockTimerRef.current = setTimeout(() => {
      submitLockRef.current = false
      setIsSubmitLocked(false)
      submitLockTimerRef.current = null
    }, 500)

    if (!sessionIdRef.current) {
      const area = selectedAreasRef.current[0] ?? null
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ areaName: area?.name, areaCode: area?.code }),
        })
        if (res.ok) {
          const body = (await res.json()) as { session: { id: string } }
          skipSessionLoadForIdRef.current = body.session.id
          onSessionCreated(body.session.id)
        }
      } catch {
        // continue without saving
      }
    }

    sendMessage({ text: textToSend })
    setInput('')
  }

  useEffect(() => {
    if (!onAreaAdd) return

    messages.forEach((message) => {
      message.parts.forEach((part) => {
        if (part.type !== 'tool-invocation') return
        const toolPart = part as {
          toolName?: string
          state?: string
          toolInvocationId?: string
          result?: unknown
        }
        if (toolPart.toolName !== 'addArea' || toolPart.state !== 'result') return
        if (!toolPart.toolInvocationId) return
        if (processedToolInvocations.current.has(toolPart.toolInvocationId)) return

        const result = toolPart.result as Partial<SelectedArea> | undefined
        if (!result?.name || !result.code || !result.prefCode || !result.level) return
        if (result.level !== 'prefecture' && result.level !== 'municipality') return

        processedToolInvocations.current.add(toolPart.toolInvocationId)
        onAreaAdd({
          name: result.name,
          code: result.code,
          prefCode: result.prefCode,
          level: result.level,
        })
      })
    })
  }, [messages, onAreaAdd])

  const prevSessionId = useRef<string | null>(null)
  useEffect(() => {
    let cancelled = false

    const loadSessionMessages = async (id: string) => {
      try {
        const res = await fetch(`/api/sessions/${id}`)
        if (!res.ok) return
        const body = (await res.json()) as { session?: { messages?: SessionMessagePayload[] } }
        const loaded = (body.session?.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role === 'assistant' ? 'assistant' : 'user',
          parts: [{ type: 'text', text: m.content }],
        })) as UIMessage[]
        if (!cancelled) {
          setMessages(loaded)
        }
      } catch {
        // ignore
      }
    }

    if (prevSessionId.current !== sessionId) {
      prevSessionId.current = sessionId
      if (sessionId === null) {
        setMessages([])
      } else if (skipSessionLoadForIdRef.current === sessionId) {
        skipSessionLoadForIdRef.current = null
      } else {
        void loadSessionMessages(sessionId)
      }
    }

    return () => {
      cancelled = true
    }
  }, [sessionId, setMessages])

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} isLoading={isLoading || isSubmitLocked} />

      <ChatInput
        selectedAreas={selectedAreas}
        onAreaClear={onAreaClear}
        onAreaRemove={onAreaRemove}
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading || isSubmitLocked}
        agentMode={agentMode}
        onAgentModeChange={setAgentMode}
        isMapOpen={isMapOpen}
        onToggleMap={onToggleMap}
      />
    </div>
  )
}

async function generateTitle(sessionId: string, userMsg: string, aiMsg: string): Promise<void> {
  try {
    const res = await fetch('/api/sessions/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userMsg, aiMsg }),
    })
    if (!res.ok) {
      throw new Error('failed')
    }
  } catch {
    // ignore
  }
}
