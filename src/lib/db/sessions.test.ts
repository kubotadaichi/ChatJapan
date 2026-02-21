import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSession,
  deleteSession,
  findOrCreateUser,
  getSessionWithMessages,
  getUserSessions,
  saveMessages,
  updateSessionTitle,
} from './sessions'

vi.mock('./prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
    chatSession: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    chatMessage: {
      createMany: vi.fn(),
    },
  },
}))

import { prisma } from './prisma'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('findOrCreateUser', () => {
  it('upserts a user by email', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test',
      image: null,
      createdAt: new Date(),
    }
    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser as never)

    const result = await findOrCreateUser({ email: 'test@example.com', name: 'Test' })

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      create: { email: 'test@example.com', name: 'Test', image: undefined },
      update: { name: 'Test', image: undefined },
    })
    expect(result.id).toBe('user-1')
  })
})

describe('createSession', () => {
  it('creates a new chat session', async () => {
    const mockSession = {
      id: 'session-1',
      userId: 'user-1',
      title: null,
      areaName: '渋谷区',
      areaCode: '13113',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(prisma.chatSession.create).mockResolvedValue(mockSession as never)

    const result = await createSession('user-1', { areaName: '渋谷区', areaCode: '13113' })

    expect(prisma.chatSession.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', areaName: '渋谷区', areaCode: '13113' },
    })
    expect(result.id).toBe('session-1')
  })
})

describe('getUserSessions', () => {
  it('returns sessions for a user ordered by newest first', async () => {
    const mockSessions = [
      {
        id: 's1',
        userId: 'user-1',
        title: '渋谷区の人口',
        areaName: '渋谷区',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    vi.mocked(prisma.chatSession.findMany).mockResolvedValue(mockSessions as never)

    const result = await getUserSessions('user-1')

    expect(prisma.chatSession.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, areaName: true, createdAt: true },
      take: 50,
    })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('渋谷区の人口')
  })
})

describe('getSessionWithMessages', () => {
  it('returns a session with messages', async () => {
    vi.mocked(prisma.chatSession.findFirst).mockResolvedValue({ id: 's1', messages: [] } as never)

    const result = await getSessionWithMessages('s1', 'u1')

    expect(prisma.chatSession.findFirst).toHaveBeenCalledWith({
      where: { id: 's1', userId: 'u1' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    expect(result?.id).toBe('s1')
  })
})

describe('updateSessionTitle', () => {
  it('updates session title', async () => {
    vi.mocked(prisma.chatSession.updateMany).mockResolvedValue({ count: 1 } as never)

    await updateSessionTitle('s1', 'u1', '新しいタイトル')

    expect(prisma.chatSession.updateMany).toHaveBeenCalledWith({
      where: { id: 's1', userId: 'u1' },
      data: { title: '新しいタイトル' },
    })
  })
})

describe('deleteSession', () => {
  it('deletes a session', async () => {
    vi.mocked(prisma.chatSession.deleteMany).mockResolvedValue({ count: 1 } as never)

    await deleteSession('s1', 'u1')

    expect(prisma.chatSession.deleteMany).toHaveBeenCalledWith({
      where: { id: 's1', userId: 'u1' },
    })
  })
})

describe('saveMessages', () => {
  it('inserts multiple messages', async () => {
    vi.mocked(prisma.chatMessage.createMany).mockResolvedValue({ count: 2 } as never)

    await saveMessages('s1', [
      { role: 'user', content: 'こんにちは', areaCode: '13113', areaName: '渋谷区' },
      { role: 'assistant', content: '渋谷区の人口は...', areaCode: '13113', areaName: '渋谷区' },
    ])

    expect(prisma.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        { sessionId: 's1', role: 'user', content: 'こんにちは', areaCode: '13113', areaName: '渋谷区' },
        { sessionId: 's1', role: 'assistant', content: '渋谷区の人口は...', areaCode: '13113', areaName: '渋谷区' },
      ],
    })
  })
})
