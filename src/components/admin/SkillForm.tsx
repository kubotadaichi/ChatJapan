'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Skill, SkillFormConfig } from '@/lib/types'
import { STATISTICS_CATEGORIES } from '@/lib/estat/categories'

interface SkillFormProps {
  initialSkill?: Skill
  parentSkills: Pick<Skill, 'id' | 'name'>[]
  mode: 'create' | 'edit'
}

const defaultFormConfig: SkillFormConfig = {
  targetIndustry: '',
  targetAudience: '',
  outputFormat: 'report',
  keyMetrics: [],
  tone: 'business',
}

function textareaClassName() {
  return 'placeholder:text-muted-foreground border-input min-h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
}

function selectClassName() {
  return 'border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
}

export function SkillForm({ initialSkill, parentSkills, mode }: SkillFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [name, setName] = useState(initialSkill?.name ?? '')
  const [description, setDescription] = useState(initialSkill?.description ?? '')
  const [icon, setIcon] = useState(initialSkill?.icon ?? '')
  const [parentId, setParentId] = useState(initialSkill?.parentId ?? '')
  const [formConfig, setFormConfig] = useState<SkillFormConfig>(
    (initialSkill?.formConfig as SkillFormConfig) ?? defaultFormConfig
  )
  const [extraPrompt, setExtraPrompt] = useState(initialSkill?.extraPrompt ?? '')
  const [statsCategories, setStatsCategories] = useState<string[]>(initialSkill?.statsCategories ?? [])
  const [systemPrompt, setSystemPrompt] = useState(initialSkill?.systemPrompt ?? '')
  const [metricsInput, setMetricsInput] = useState(
    (initialSkill?.formConfig as SkillFormConfig)?.keyMetrics?.join('、') ?? ''
  )

  async function handleGeneratePrompt() {
    setGenerating(true)
    try {
      const parentSkill = parentId ? parentSkills.find((s) => s.id === parentId) : null

      let parentSystemPrompt: string | undefined
      if (parentSkill) {
        const res = await fetch('/api/admin/skills')
        const all: Skill[] = await res.json()
        const parent = all.find((s) => s.id === parentId)
        parentSystemPrompt = parent?.systemPrompt
      }

      const res = await fetch('/api/admin/skills/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formConfig: {
            ...formConfig,
            keyMetrics: metricsInput
              .split(/[、,]/)
              .map((m) => m.trim())
              .filter(Boolean),
          },
          extraPrompt: extraPrompt || undefined,
          parentSystemPrompt,
        }),
      })

      const data = await res.json()
      setSystemPrompt(data.systemPrompt)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        name,
        description,
        icon: icon || null,
        parentId: parentId || null,
        formConfig: {
          ...formConfig,
          keyMetrics: metricsInput
            .split(/[、,]/)
            .map((m) => m.trim())
            .filter(Boolean),
        },
        extraPrompt: extraPrompt || null,
        systemPrompt,
        statsCategories,
        customStatsIds: [],
        isActive: initialSkill?.isActive ?? true,
        sortOrder: initialSkill?.sortOrder ?? 0,
      }

      const url = mode === 'create' ? '/api/admin/skills' : `/api/admin/skills/${initialSkill!.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push('/admin/skills')
        return
      }

      const data = await res.json().catch(() => null)
      alert(data?.error ?? '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">{mode === 'create' ? 'スキルを作成' : 'スキルを編集'}</h1>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 1: 基本情報</h2>
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              スキル名
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 飲食店市場分析"
            />
          </div>
          <div>
            <label htmlFor="description" className="text-sm font-medium">
              説明（ユーザーに表示）
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 飲食業の市場規模・店舗密度・売上を分析します"
            />
          </div>
          <div>
            <label htmlFor="icon" className="text-sm font-medium">
              アイコン（絵文字）
            </label>
            <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📊" className="w-24" />
          </div>
          <div>
            <label htmlFor="parentSkill" className="text-sm font-medium">
              親スキル（任意）
            </label>
            <select
              id="parentSkill"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={selectClassName()}
            >
              <option value="">なし（トップレベル）</option>
              {parentSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 2: ガイド設定</h2>
          <div>
            <label htmlFor="industry" className="text-sm font-medium">
              対象業界・テーマ
            </label>
            <Input
              id="industry"
              value={formConfig.targetIndustry}
              onChange={(e) => setFormConfig({ ...formConfig, targetIndustry: e.target.value })}
              placeholder="例: 飲食業・外食産業"
            />
          </div>
          <div>
            <label htmlFor="audience" className="text-sm font-medium">
              想定ユーザー
            </label>
            <Input
              id="audience"
              value={formConfig.targetAudience}
              onChange={(e) => setFormConfig({ ...formConfig, targetAudience: e.target.value })}
              placeholder="例: 出店を検討している事業者"
            />
          </div>
          <div>
            <label htmlFor="outputFormat" className="text-sm font-medium">
              出力形式
            </label>
            <select
              id="outputFormat"
              value={formConfig.outputFormat}
              onChange={(e) =>
                setFormConfig({
                  ...formConfig,
                  outputFormat: e.target.value as SkillFormConfig['outputFormat'],
                })
              }
              className={selectClassName()}
            >
              <option value="report">詳細レポート</option>
              <option value="table">比較テーブル</option>
              <option value="slide">スライド（Marp）</option>
              <option value="bullets">箇条書き</option>
            </select>
          </div>
          <div>
            <label htmlFor="metrics" className="text-sm font-medium">
              重視する指標（読点・カンマ区切り）
            </label>
            <Input
              id="metrics"
              value={metricsInput}
              onChange={(e) => setMetricsInput(e.target.value)}
              placeholder="例: 売上規模、従業者数、店舗密度"
            />
          </div>
          <div>
            <label htmlFor="tone" className="text-sm font-medium">
              文体・トーン
            </label>
            <select
              id="tone"
              value={formConfig.tone}
              onChange={(e) =>
                setFormConfig({
                  ...formConfig,
                  tone: e.target.value as SkillFormConfig['tone'],
                })
              }
              className={selectClassName()}
            >
              <option value="formal">丁寧・公式</option>
              <option value="business">ビジネス向け</option>
              <option value="casual">わかりやすい</option>
            </select>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 3: 追加指示（任意）</h2>
          <div>
            <label htmlFor="extra" className="text-sm font-medium">
              その他の分析方針・注意事項
            </label>
            <textarea
              id="extra"
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
              placeholder="例: 必ず競合エリアとの比較を含めること。データが古い場合は必ず注記すること。"
              rows={6}
              className={textareaClassName()}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 4: 統計データ設定</h2>
          <p className="text-sm text-muted-foreground">未選択の場合は全カテゴリを使用します。</p>
          <div className="space-y-3">
            {STATISTICS_CATEGORIES.map((cat) => (
              <label key={cat.id} htmlFor={cat.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                <input
                  id={cat.id}
                  type="checkbox"
                  checked={statsCategories.includes(cat.id)}
                  onChange={(e) => {
                    setStatsCategories(
                      e.target.checked
                        ? [...statsCategories, cat.id]
                        : statsCategories.filter((c) => c !== cat.id)
                    )
                  }}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-medium">{cat.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{cat.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 5: プロンプト生成・確認</h2>
          <Button
            type="button"
            variant="outline"
            onClick={handleGeneratePrompt}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                AIでプロンプトを生成
              </>
            )}
          </Button>
          <div>
            <label htmlFor="prompt" className="text-sm font-medium">
              システムプロンプト（編集可）
            </label>
            <textarea
              id="prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={16}
              className={`${textareaClassName()} font-mono text-sm`}
              placeholder="「AIでプロンプトを生成」ボタンを押すか、直接入力してください。"
            />
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
          戻る
        </Button>
        {step < 5 ? (
          <Button onClick={() => setStep(step + 1)}>次へ</Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !systemPrompt.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              '保存'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
