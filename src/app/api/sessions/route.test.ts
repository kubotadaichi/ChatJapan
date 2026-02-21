import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

vi.mock('@/lib/auth', () => ({
  getAuthSession: vi.fn(),
}))
vi.mock('@/lib/db/sessions', () => ({
  findOrCreateUser: vi.fn(),
  createSession: vi.fn(),
  getUserSessions: vi.fn(),
}))

import { getAuthSession } from '@/lib/auth'
import { createSession, findOrCreateUser, getUserSessions } from '@/lib/db/sessions'

const makeRequest = (body?: unknown) =>
  new Request('http://localhost/api/sessions', {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/sessions', () => {
  it('returns 401 if not authenticated', async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns sessions for authenticated user', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test', image: null },
      expires: '',
    } as never)
    vi.mocked(findOrCreateUser).mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      name: 'Test',
      image: null,
      createdAt: new Date(),
    } as never)
    vi.mocked(getUserSessions).mockResolvedValue([
      { id: 's1', title: '渋谷区の人口', areaName: '渋谷区', createdAt: new Date() },
    ] as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toHaveLength(1)
    expect(body.sessions[0].id).toBe('s1')
  })
})

describe('POST /api/sessions', () => {
  it('creates a new session', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test', image: null },
      expires: '',
    } as never)
    vi.mocked(findOrCreateUser).mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      name: 'Test',
      image: null,
      createdAt: new Date(),
    } as never)
    vi.mocked(createSession).mockResolvedValue({
      id: 's1',
      userId: 'u1',
      title: null,
      areaName: '渋谷区',
      areaCode: '13113',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await POST(
      new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaName: '渋谷区', areaCode: '13113' }),
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session.id).toBe('s1')
  })
})
