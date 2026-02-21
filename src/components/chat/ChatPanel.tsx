'use client'

import { useState, useRef, useMemo, FormEvent, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import type { SelectedArea } from '@/lib/types'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import type { CategoryCoverageItem } from './CategoryCoverageChips'

interface ChatPanelProps {
  selectedArea: SelectedArea | null
  onAreaClear: () => void
  sessionId: string | null
  onSessionCreated: (id: string) => void
  onTitleGenerated: () => void
}

function extractTextContent(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => ('text' in p ? p.text : ''))
    .join('')
}

export function ChatPanel({
  selectedArea,
  onAreaClear,
  sessionId,
  onSessionCreated,
  onTitleGenerated,
}: ChatPanelProps) {
  const selectedAreaRef = useRef(selectedArea)
  selectedAreaRef.current = selectedArea
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId
  const [categories, setCategories] = useState<CategoryCoverageItem[]>([])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ selectedArea: selectedAreaRef.current }),
      }),
    []
  )

  const { messages, setMessages, sendMessage, status } = useChat({ transport })
  const [input, setInput] = useState('')
  const isLoading = status === 'submitted' || status === 'streaming'

  const prevStatus = useRef(status)
  const isSavingRef = useRef(false)

  useEffect(() => {
    const wasStreaming = prevStatus.current === 'streaming'
    const isReady = status === 'ready'
    prevStatus.current = status

    if (!wasStreaming || !isReady) return
    if (isSavingRef.current) return

    const currentSessionId = sessionIdRef.current
    if (!currentSessionId) return
    if (messages.length < 2) return

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    const lastAiMsg = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!lastUserMsg || !lastAiMsg) return

    isSavingRef.current = true

    const area = selectedAreaRef.current
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
    let cancelled = false

    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/statistics/categories')
        if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`)
        const body = (await res.json()) as { categories?: CategoryCoverageItem[] }
        if (!cancelled && Array.isArray(body.categories) && body.categories.length > 0) {
          setCategories(body.categories)
        }
      } catch {
        if (!cancelled) {
          setCategories((current) => (current.length === 0 ? current : []))
        }
      }
    }

    void fetchCategories()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return

    if (!sessionIdRef.current) {
      const area = selectedAreaRef.current
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ areaName: area?.name, areaCode: area?.code }),
        })
        if (res.ok) {
          const body = (await res.json()) as { session: { id: string } }
          onSessionCreated(body.session.id)
        }
      } catch {
        // continue without saving
      }
    }

    sendMessage({ text: input })
    setInput('')
  }

  const prevSessionId = useRef(sessionId)
  useEffect(() => {
    if (prevSessionId.current !== sessionId) {
      prevSessionId.current = sessionId
      if (sessionId === null) {
        setMessages([])
      }
    }
  }, [sessionId, setMessages])

  return (
    <div className="flex flex-col h-full">
      <div
        data-testid="chat-panel-header"
        className="px-5 py-3 border-b border-border/60 bg-background bg-background/80 backdrop-blur"
      >
        <h1 className="font-medium text-sm text-foreground tracking-tight">ChatJapan</h1>
      </div>

      <MessageList messages={messages} />

      <ChatInput
        selectedArea={selectedArea}
        categories={categories}
        onAreaClear={onAreaClear}
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
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
