'use client'

import { useChat } from 'ai/react'
import type { SelectedArea } from '@/lib/types'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

interface ChatPanelProps {
  selectedArea: SelectedArea | null
}

export function ChatPanel({ selectedArea }: ChatPanelProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { selectedArea },
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-white">
        <h1 className="font-semibold text-sm text-zinc-900">ChatJapan</h1>
        {selectedArea && (
          <p className="text-xs text-zinc-500 mt-0.5">
            🗾 {selectedArea.name}
          </p>
        )}
      </div>

      <MessageList messages={messages} />

      <ChatInput
        input={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
