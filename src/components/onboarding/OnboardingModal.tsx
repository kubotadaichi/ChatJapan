'use client'

import { useEffect, useState } from 'react'
import { MapPinned, MessageSquare, BarChart3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OnboardingModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('guided')) {
      setOpen(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('guided', '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          aria-label="閉じる"
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="onboarding-title" className="mb-1 text-lg font-semibold">
          ChatJapan へようこそ
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">日本の統計データをAIと一緒に探索しましょう。</p>

        <div className="mb-6 space-y-4">
          <div className="flex items-start gap-3">
            <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">1. 地図でエリアを選択</p>
              <p className="text-xs text-muted-foreground">都道府県や市区町村をクリックして選択します。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">2. 質問する</p>
              <p className="text-xs text-muted-foreground">例:「この地域の人口構成を教えて」</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">3. 統計データで回答</p>
              <p className="text-xs text-muted-foreground">e-Stat（政府統計ポータル）のデータで回答します。</p>
            </div>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full">
          はじめる
        </Button>
      </div>
    </div>
  )
}
