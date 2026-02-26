import { describe, expect, it } from 'vitest'
import type { Skill } from '@/lib/types'
import { buildSkillSystemPrompt, resolveSkillCategories } from './skills'

const baseSkill: Skill = {
  id: 'test-id',
  name: 'テストスキル',
  description: 'desc',
  icon: null,
  parentId: null,
  formConfig: {
    targetIndustry: '飲食業',
    targetAudience: '事業者',
    outputFormat: 'report',
    keyMetrics: ['売上'],
    tone: 'business',
  },
  extraPrompt: null,
  systemPrompt: '子のプロンプト',
  statsCategories: [],
  customStatsIds: [],
  isActive: true,
  sortOrder: 0,
}

describe('buildSkillSystemPrompt', () => {
  it('親なしのとき子のプロンプト + エリアコンテキストを返す', () => {
    const result = buildSkillSystemPrompt(baseSkill, 'エリア情報')
    expect(result).toContain('子のプロンプト')
    expect(result).toContain('エリア情報')
  })

  it('親があるとき親->子の順で結合する', () => {
    const skillWithParent = {
      ...baseSkill,
      parent: { ...baseSkill, systemPrompt: '親のプロンプト' },
    }
    const result = buildSkillSystemPrompt(skillWithParent, 'エリア')
    expect(result.indexOf('親のプロンプト')).toBeLessThan(result.indexOf('子のプロンプト'))
  })
})

describe('resolveSkillCategories', () => {
  it('子にカテゴリがあれば子を返す', () => {
    const skill = { ...baseSkill, statsCategories: ['population'] }
    expect(resolveSkillCategories(skill)).toEqual(['population'])
  })

  it('子が空で親があれば親を返す', () => {
    const skill = {
      ...baseSkill,
      statsCategories: [],
      parent: { ...baseSkill, statsCategories: ['commerce'] },
    }
    expect(resolveSkillCategories(skill)).toEqual(['commerce'])
  })

  it('子も親も空ならnullを返す', () => {
    expect(resolveSkillCategories(baseSkill)).toBeNull()
  })
})
