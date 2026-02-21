import { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPinned, Send, X } from 'lucide-react'
import type { SelectedArea } from '@/lib/types'
import { CategoryCoverageChips } from './CategoryCoverageChips'
import type { CategoryCoverageItem } from './CategoryCoverageChips'

interface ChatInputProps {
  selectedArea: SelectedArea | null
  categories: CategoryCoverageItem[]
  onAreaClear: () => void
  input: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}

export function ChatInput({ selectedArea, categories, onAreaClear, input, onChange, onSubmit, isLoading }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="border-t border-border/60 bg-background/85 backdrop-blur px-3 py-3">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-2 shadow-sm">
        <CategoryCoverageChips categories={categories} />
        {selectedArea && (
          <div
            data-testid="selected-area-chip"
            className="mb-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
          >
            <MapPinned className="h-3.5 w-3.5" />
            <span>{selectedArea.name}</span>
            <button
              type="button"
              aria-label="選択解除"
              onClick={onAreaClear}
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background/70"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
        <Input
          value={input}
          onChange={onChange}
          placeholder="メッセージを入力..."
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
