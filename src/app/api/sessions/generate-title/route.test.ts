import { describe, expect, it, vi } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/auth', () => ({ getAuthSession: vi.fn() }))
vi.mock('@/lib/db/sessions', () => ({
  findOrCreateUser: vi.fn(),
  updateSessionTitle: vi.fn(),
}))
vi.mock('ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('ai')>()
  return {
    ...mod,
    generateText: vi.fn().mockResolvedValue({ text: '渋谷区の人口統計' }),
  }
})

import { getAuthSession } from '@/lib/auth'
import { findOrCreateUser, updateSessionTitle } from '@/lib/db/sessions'

describe('POST /api/sessions/generate-title', () => {
  it('returns 401 if not authenticated', async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null)
    const res = await POST(
      new Request('http://localhost/api/sessions/generate-title', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 's1', userMsg: 'Hello', aiMsg: 'World' }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('generates and saves title', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { email: 'a@b.com' }, expires: '' } as never)
    vi.mocked(findOrCreateUser).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      name: null,
      image: null,
      createdAt: new Date(),
    } as never)
    vi.mocked(updateSessionTitle).mockResolvedValue({} as never)

    const res = await POST(
      new Request('http://localhost/api/sessions/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 's1',
          userMsg: '渋谷区の人口を教えて',
          aiMsg: '渋谷区の人口は約23万人です',
        }),
      })
    )
    expect(res.status).toBe(200)
    expect(updateSessionTitle).toHaveBeenCalledWith('s1', 'u1', '渋谷区の人口統計')
  })
})
