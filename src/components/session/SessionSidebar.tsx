import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

interface SessionItem {
  id: string
  title: string | null
  areaName: string | null
  createdAt: Date
}

interface SessionSidebarProps {
  sessions: SessionItem[]
  currentSessionId: string | null
  onNewSession: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  headerAction?: ReactNode
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  headerAction,
}: SessionSidebarProps) {
  return (
    <div className="flex h-full flex-col border-r border-border bg-muted/30">
      <div className="border-b border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={onNewSession}
            aria-label="新しい会話"
          >
            <Plus className="h-3.5 w-3.5" />
            新しい会話
          </Button>
          {headerAction}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sessions.map((session) => {
          const label = session.title ?? session.areaName ?? '無題の会話'
          const isActive = session.id === currentSessionId

          return (
            <div
              key={session.id}
              className={`group mx-2 mb-0.5 flex items-center gap-1 rounded-md ${
                isActive ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              <button
                className={`min-w-0 flex-1 truncate px-2 py-1.5 text-left text-xs ${
                  isActive ? 'bg-accent' : ''
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                {label}
              </button>
              <button
                aria-label="削除"
                className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteSession(session.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
