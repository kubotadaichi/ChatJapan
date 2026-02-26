'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Wand2 } from 'lucide-react'
import type { Skill } from '@/lib/types'
import type { AgentMode } from '@/lib/llm/prompts'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type SkillSelection =
  | { type: 'auto' }
  | { type: 'none'; agentMode: AgentMode }
  | { type: 'skill'; skillId: string; skillName: string }

interface SkillPickerProps {
  value: SkillSelection
  onChange: (v: SkillSelection) => void
}

const AGENT_MODES: { mode: AgentMode; label: string }[] = [
  { mode: 'default', label: 'デフォルト' },
  { mode: 'marketing', label: 'マーケティング' },
  { mode: 'slides', label: 'スライド生成' },
]

export function SkillPicker({ value, onChange }: SkillPickerProps) {
  const [skills, setSkills] = useState<Skill[]>([])

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then(setSkills)
      .catch(() => {})
  }, [])

  const label =
    value.type === 'auto'
      ? '自動'
      : value.type === 'skill'
        ? value.skillName
        : AGENT_MODES.find((m) => m.mode === value.agentMode)?.label ?? 'デフォルト'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
          {value.type === 'auto' && <Wand2 className="h-3 w-3" />}
          {label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => onChange({ type: 'auto' })}>
          <Wand2 className="mr-2 h-3.5 w-3.5" />
          自動（入力から判断）
          {value.type === 'auto' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {AGENT_MODES.map(({ mode, label: modeLabel }) => (
          <DropdownMenuItem key={mode} onClick={() => onChange({ type: 'none', agentMode: mode })}>
            {modeLabel}
            {value.type === 'none' && value.agentMode === mode && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
        {skills.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {skills.map((skill) => (
              <div key={skill.id}>
                <DropdownMenuItem
                  onClick={() => onChange({ type: 'skill', skillId: skill.id, skillName: skill.name })}
                >
                  <span className="mr-2">{skill.icon ?? '📊'}</span>
                  {skill.name}
                  {value.type === 'skill' && value.skillId === skill.id && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                {skill.children?.map((child) => (
                  <DropdownMenuItem
                    key={child.id}
                    className="pl-7"
                    onClick={() =>
                      onChange({ type: 'skill', skillId: child.id, skillName: child.name })
                    }
                  >
                    <ChevronRight className="mr-1 h-3 w-3 text-muted-foreground" />
                    <span className="mr-2">{child.icon ?? '📋'}</span>
                    {child.name}
                    {value.type === 'skill' && value.skillId === child.id && (
                      <span className="ml-auto">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
