'use client'

import { useState, useRef, useMemo, FormEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { SelectedArea } from '@/lib/types'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

interface ChatPanelProps {
  selectedArea: SelectedArea | null
  onAreaClear: () => void
}

export function ChatPanel({ selectedArea, onAreaClear }: ChatPanelProps) {
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
      <div
        data-testid="chat-panel-header"
        className="px-5 py-3 border-b border-border/60 bg-background bg-background/80 backdrop-blur"
      >
        <h1 className="font-medium text-sm text-foreground tracking-tight">ChatJapan</h1>
      </div>

      <MessageList messages={messages} />

      <ChatInput
        selectedArea={selectedArea}
        onAreaClear={onAreaClear}
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
