import { describe, it, expect } from 'vitest'
import type { SelectedArea, Message } from './types'

describe('types', () => {
  it('SelectedArea is correctly typed', () => {
    const area: SelectedArea = {
      name: '渋谷区',
      code: '13113',
      prefCode: '13',
      level: 'municipality',
    }
    expect(area.code).toBe('13113')
    expect(area.level).toBe('municipality')
  })

  it('Message has correct structure', () => {
    const msg: Message = {
      id: '1',
      role: 'user',
      content: 'テスト',
      createdAt: new Date(),
    }
    expect(msg.role).toBe('user')
  })
})
