'use client'

import { useState, useRef, useMemo, FormEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { SelectedArea } from '@/lib/types'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

interface ChatPanelProps {
  selectedArea: SelectedArea | null
}

export function ChatPanel({ selectedArea }: ChatPanelProps) {
  const selectedAreaRef = useRef(selectedArea)
  selectedAreaRef.current = selectedArea

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ selectedArea: selectedAreaRef.current }),
      }),
    []
  )

  const { messages, sendMessage, status } = useChat({ transport })
  const [input, setInput] = useState('')
  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-background">
        <h1 className="font-semibold text-sm text-foreground">ChatJapan</h1>
        {selectedArea && (
          <p className="text-xs text-muted-foreground mt-0.5">
            🗾 {selectedArea.name}
          </p>
        )}
      </div>

      <MessageList messages={messages} />

      <ChatInput
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
