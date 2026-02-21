import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'

interface MessageListProps {
  messages: UIMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
        <p className="max-w-sm leading-relaxed">
          地図でエリアを選択して、統計情報について質問してみましょう。<br />例: 「この地域の人口構成を教えて」
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 space-y-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-foreground text-background rounded-br-md'
                  : 'bg-muted/80 text-foreground'
              }`}
            >
              {message.parts
                .filter((p) => p.type === 'text')
                .map((p) => ('text' in p ? p.text : ''))
                .join('')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
