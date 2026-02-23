import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UIMessage } from 'ai'
import { Copy, ThumbsDown, ThumbsUp } from 'lucide-react'

interface MessageListProps {
  messages: UIMessage[]
  isLoading?: boolean
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => ('text' in part ? part.text : ''))
    .join('')
}

const TOOL_LABELS: Record<string, string> = {
  listStatisticsCategories: '統計カテゴリを確認中',
  fetchStatistics: '統計データを取得中',
  searchStatsList: '統計表を検索中',
  fetchStatsByStatsId: 'データを取得中',
  getAreaInfo: 'エリア情報を確認中',
  addArea: 'エリアを設定中',
}

function parseMarpSlides(text: string): string[] | null {
  const match = text.match(/```markdown\n([\s\S]+?)\n```/)
  if (!match) return null
  return match[1].split(/\n---\n/).map((slide) => slide.trim())
}

function SlidePreview({ slides }: { slides: string[] }) {
  const [current, setCurrent] = useState(0)
  const total = slides.length

  return (
    <div className="w-full max-w-[85%] overflow-hidden rounded-2xl border border-border">
      <div className="min-h-[160px] bg-muted/40 px-4 py-6">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{slides[current]}</ReactMarkdown>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => setCurrent((c) => c - 1)}
          className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
        >
          前へ
        </button>
        <span>
          {current + 1} / {total}
        </span>
        <button
          type="button"
          disabled={current === total - 1}
          onClick={() => setCurrent((c) => c + 1)}
          className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
        >
          次へ
        </button>
      </div>
    </div>
  )
}

function AssistantMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const slides = parseMarpSlides(text)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative max-w-[85%]">
      {slides ? (
        <SlidePreview slides={slides} />
      ) : (
        <div className="rounded-2xl bg-muted/80 px-4 py-2.5 text-sm leading-relaxed text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}
      <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="コピー"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Copy className="h-3 w-3" />
          {copied ? 'コピー済み' : 'コピー'}
        </button>
        <button
          type="button"
          aria-label="良い回答"
          className="inline-flex items-center rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ThumbsUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label="改善が必要"
          className="inline-flex items-center rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ThumbsDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" role="status" aria-label="回答を生成中">
      <div className="rounded-2xl bg-muted/80 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    </div>
  )
}

function ToolCallIndicator({ toolName }: { toolName: string }) {
  const label = TOOL_LABELS[toolName] ?? 'データを処理中'

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
        <svg
          className="h-3.5 w-3.5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {label}...
      </div>
    </div>
  )
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
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

  const lastMessage = messages[messages.length - 1]
  const activeToolCalls =
    isLoading && lastMessage
      ? lastMessage.parts
          .filter((p) => p.type === 'tool-invocation' && (p as { state?: string }).state === 'call')
          .map((p) => p as { toolName?: string; toolInvocationId?: string })
      : []

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 space-y-5">
        {messages.map((message, messageIndex) => {
          const text = getMessageText(message)

          return (
            <div key={`${message.id}-${messageIndex}`} className="space-y-2">
              {text && (
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' ? (
                    <AssistantMessage text={text} />
                  ) : (
                    <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-foreground text-background rounded-br-md">
                      {text}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {isLoading && (
          <div className="space-y-2">
            {activeToolCalls.map((tool, i) => (
              <ToolCallIndicator
                key={tool.toolInvocationId ?? String(i)}
                toolName={tool.toolName ?? ''}
              />
            ))}
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
