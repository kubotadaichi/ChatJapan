import { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPinned, Plus, Send, Wand2, X } from 'lucide-react'
import type { SelectedArea } from '@/lib/types'
import { SkillPicker, type SkillSelection } from './SkillPicker'

interface ChatInputProps {
  selectedAreas: SelectedArea[]
  onAreaClear: () => void
  onAreaRemove: (area: SelectedArea) => void
  input: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  skillSelection: SkillSelection
  onSkillSelectionChange: (v: SkillSelection) => void
  autoSelectedSkill: { skillId: string; skillName: string } | null
  onClearAutoSelected: () => void
  isMapOpen?: boolean
  onToggleMap?: () => void
}

export function ChatInput({
  selectedAreas,
  onAreaClear,
  onAreaRemove,
  input,
  onChange,
  onSubmit,
  isLoading,
  skillSelection,
  onSkillSelectionChange,
  autoSelectedSkill,
  onClearAutoSelected,
  isMapOpen = false,
  onToggleMap,
}: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="border-t border-border/60 bg-background/85 backdrop-blur px-3 py-3">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-2 shadow-sm">
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <SkillPicker value={skillSelection} onChange={onSkillSelectionChange} />
          {autoSelectedSkill && skillSelection.type === 'auto' && (
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary">
              <Wand2 className="h-3 w-3" />
              <span>{autoSelectedSkill.skillName}</span>
              <button
                type="button"
                onClick={onClearAutoSelected}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {selectedAreas.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {selectedAreas.map((area) => (
              <div
                key={`${area.level}-${area.code}`}
                data-testid="selected-area-chip"
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                <MapPinned className="h-3.5 w-3.5" />
                <span>{area.name}</span>
                <button
                  type="button"
                  aria-label={`${area.name}の選択を解除`}
                  onClick={() => onAreaRemove(area)}
                  className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {selectedAreas.length > 1 && (
              <button
                type="button"
                onClick={onAreaClear}
                className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" />
                すべて解除
              </button>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          {onToggleMap && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={isMapOpen ? '地図を閉じる' : '地図を開く'}
              onClick={onToggleMap}
              className="size-9 rounded-xl"
            >
              {isMapOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          )}
          <Input
            name="message"
            autoComplete="off"
            value={input}
            onChange={onChange}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder="メッセージを入力…"
            disabled={isLoading}
            className="flex-1 h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input?.trim()}
            aria-label="送信"
            className="size-9 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
