import { prisma } from './prisma'

export interface MessageInput {
  role: string
  content: string
  areaCode?: string | null
  areaName?: string | null
}

export async function findOrCreateUser(params: {
  email: string
  name?: string | null
  image?: string | null
}) {
  return prisma.user.upsert({
    where: { email: params.email },
    create: {
      email: params.email,
      name: params.name ?? undefined,
      image: params.image ?? undefined,
    },
    update: {
      name: params.name ?? undefined,
      image: params.image ?? undefined,
    },
  })
}

export async function createSession(
  userId: string,
  area?: { areaName?: string | null; areaCode?: string | null }
) {
  return prisma.chatSession.create({
    data: {
      userId,
      areaName: area?.areaName ?? null,
      areaCode: area?.areaCode ?? null,
    },
  })
}

export async function getUserSessions(userId: string) {
  return prisma.chatSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, areaName: true, createdAt: true },
    take: 50,
  })
}

export async function getSessionWithMessages(sessionId: string, userId: string) {
  return prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function updateSessionTitle(sessionId: string, userId: string, title: string) {
  return prisma.chatSession.updateMany({
    where: { id: sessionId, userId },
    data: { title },
  })
}

export async function deleteSession(sessionId: string, userId: string) {
  return prisma.chatSession.deleteMany({
    where: { id: sessionId, userId },
  })
}

export async function saveMessages(sessionId: string, messages: MessageInput[]) {
  if (messages.length === 0) {
    return { count: 0 }
  }

  return prisma.chatMessage.createMany({
    data: messages.map((m) => ({
      sessionId,
      role: m.role,
      content: m.content,
      areaCode: m.areaCode ?? null,
      areaName: m.areaName ?? null,
    })),
  })
}
