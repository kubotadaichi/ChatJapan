'use client'

import { useState } from 'react'
import { Bot, ChevronDown } from 'lucide-react'
import type { AgentMode } from '@/lib/llm/prompts'

const MODE_LABELS: Record<AgentMode, string> = {
  default: 'デフォルト',
  marketing: 'マーケティング担当',
  slides: 'スライド作成',
}

interface AgentModeSelectorProps {
  mode: AgentMode
  onModeChange: (mode: AgentMode) => void
}

export function AgentModeSelector({ mode, onModeChange }: AgentModeSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bot className="h-3.5 w-3.5" />
        {MODE_LABELS[mode]}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute bottom-full left-0 z-20 mb-1 min-w-[160px] rounded-lg border border-border bg-background shadow-md">
            {(Object.entries(MODE_LABELS) as [AgentMode, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onModeChange(value)
                  setOpen(false)
                }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-muted ${
                  mode === value ? 'font-medium text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
