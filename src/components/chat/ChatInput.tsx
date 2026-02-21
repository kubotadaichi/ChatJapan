import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, MapPinned, Plus, Send, X } from 'lucide-react'
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
  isMapOpen?: boolean
  onToggleMap?: () => void
}

export function ChatInput({
  selectedArea,
  categories,
  onAreaClear,
  input,
  onChange,
  onSubmit,
  isLoading,
  isMapOpen = false,
  onToggleMap,
}: ChatInputProps) {
  const [showCategories, setShowCategories] = useState(false)

  return (
    <form onSubmit={onSubmit} className="border-t border-border/60 bg-background/85 backdrop-blur px-3 py-3">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-2 shadow-sm">
        {categories.length > 0 && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">カテゴリ対応表示</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={showCategories ? 'カテゴリ非表示' : 'カテゴリ表示'}
              className="h-7 px-2 text-xs"
              onClick={() => setShowCategories((prev) => !prev)}
            >
              {showCategories ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showCategories ? 'カテゴリ非表示' : 'カテゴリ表示'}
            </Button>
          </div>
        )}
        {showCategories && <CategoryCoverageChips categories={categories} />}
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
