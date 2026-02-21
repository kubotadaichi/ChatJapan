import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/auth', () => ({ getAuthSession: vi.fn() }))
vi.mock('@/lib/db/sessions', () => ({
  findOrCreateUser: vi.fn(),
  saveMessages: vi.fn(),
}))

import { getAuthSession } from '@/lib/auth'
import { findOrCreateUser, saveMessages } from '@/lib/db/sessions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/sessions/[id]/messages', () => {
  it('returns 401 if not authenticated', async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null)
    const res = await POST(
      new Request('http://localhost/api/sessions/s1/messages', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    )
    expect(res.status).toBe(401)
  })

  it('saves messages to session', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { email: 'a@b.com' }, expires: '' } as never)
    vi.mocked(findOrCreateUser).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      name: null,
      image: null,
      createdAt: new Date(),
    } as never)
    vi.mocked(saveMessages).mockResolvedValue({ count: 2 } as never)

    const res = await POST(
      new Request('http://localhost/api/sessions/s1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello', areaCode: '13113', areaName: '渋谷区' },
            { role: 'assistant', content: 'こんにちは', areaCode: '13113', areaName: '渋谷区' },
          ],
        }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    )
    expect(res.status).toBe(200)
    expect(saveMessages).toHaveBeenCalledWith(
      's1',
      expect.arrayContaining([expect.objectContaining({ role: 'user', content: 'Hello' })])
    )
  })
})
