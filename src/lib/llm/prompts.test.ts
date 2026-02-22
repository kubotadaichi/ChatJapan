import { describe, expect, it } from 'vitest'
import { getSystemPrompt } from './prompts'

describe('getSystemPrompt', () => {
  it('デフォルトモードのプロンプトを返す', () => {
    const prompt = getSystemPrompt('default', '東京都')
    expect(prompt).toContain('ChatJapan')
    expect(prompt).toContain('東京都')
  })

  it('マーケティングモードのプロンプトを返す', () => {
    const prompt = getSystemPrompt('marketing', '渋谷区')
    expect(prompt).toContain('マーケティング')
    expect(prompt).toContain('渋谷区')
  })

  it('スライドモードのプロンプトを返す', () => {
    const prompt = getSystemPrompt('slides', '福岡市')
    expect(prompt).toContain('Marp')
    expect(prompt).toContain('福岡市')
  })
})
