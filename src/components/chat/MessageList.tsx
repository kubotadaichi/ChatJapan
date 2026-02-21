import type { UIMessage } from 'ai'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MessageListProps {
  messages: UIMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm px-6 text-center">
        <p>地図でエリアを選択して、統計情報について質問してみましょう。<br />例: 「この地域の人口構成を教えて」</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-100 text-zinc-900'
                }`}
            >
              {message.parts
              .filter((p) => p.type === 'text')
              .map((p) => ('text' in p ? p.text : ''))
              .join('')}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
