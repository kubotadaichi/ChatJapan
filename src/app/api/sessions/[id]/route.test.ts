import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, PATCH } from './route'

vi.mock('@/lib/auth', () => ({ getAuthSession: vi.fn() }))
vi.mock('@/lib/db/sessions', () => ({
  deleteSession: vi.fn(),
  findOrCreateUser: vi.fn(),
  getSessionWithMessages: vi.fn(),
  updateSessionTitle: vi.fn(),
}))

import { getAuthSession } from '@/lib/auth'
import {
  deleteSession,
  findOrCreateUser,
  getSessionWithMessages,
  updateSessionTitle,
} from '@/lib/db/sessions'

const params = Promise.resolve({ id: 's1' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/sessions/[id]', () => {
  it('returns 401 if not authenticated', async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/sessions/s1')
    const res = await GET(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns session with messages', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { email: 'a@b.com' }, expires: '' } as never)
    vi.mocked(findOrCreateUser).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      name: null,
      image: null,
      createdAt: new Date(),
    } as never)
    vi.mocked(getSessionWithMessages).mockResolvedValue({
      id: 's1',
      userId: 'u1',
      title: null,
      areaName: null,
      areaCode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [
        {
          id: 'm1',
          sessionId: 's1',
          role: 'user',
          content: 'Hello',
          areaCode: null,
          areaName: null,
          createdAt: new Date(),
        },
      ],
    } as never)

    const req = new Request('http://localhost/api/sessions/s1')
    const res = await GET(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session.messages).toHaveLength(1)
  })
})

describe('PATCH /api/sessions/[id]', () => {
  it('updates session title', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { email: 'a@b.com' }, expires: '' } as never)
    vi.mocked(findOrCreateUser).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      name: null,
      image: null,
      createdAt: new Date(),
    } as never)
    vi.mocked(updateSessionTitle).mockResolvedValue({} as never)

    const req = new Request('http://localhost/api/sessions/s1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '渋谷区の人口統計' }),
    })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
    expect(updateSessionTitle).toHaveBeenCalledWith('s1', 'u1', '渋谷区の人口統計')
  })
})

describe('DELETE /api/sessions/[id]', () => {
  it('deletes a session', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { email: 'a@b.com' }, expires: '' } as never)
    vi.mocked(findOrCreateUser).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      name: null,
      image: null,
      createdAt: new Date(),
    } as never)
    vi.mocked(deleteSession).mockResolvedValue({} as never)

    const req = new Request('http://localhost/api/sessions/s1', { method: 'DELETE' })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(200)
    expect(deleteSession).toHaveBeenCalledWith('s1', 'u1')
  })
})
