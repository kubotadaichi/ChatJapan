# 会話履歴DB保存 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Vercel Postgres + Prisma でログインユーザーの会話履歴を永続化し、サイドバーからセッションを復元できる3カラムレイアウトを実装する。

**Architecture:** API保存型。`useChat` の status 監視（streaming→ready 遷移）で `POST /api/sessions/[id]/messages` へ保存。レイアウトは `react-resizable-panels` で左(サイドバー)・中(地図)・右(チャット)の3カラム。ログイン時のみサイドバー表示。

**Tech Stack:** Prisma + Vercel Postgres, react-resizable-panels, @ai-sdk/react v3, next-auth v4

---

## Task 1: Prisma セットアップ

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `package.json`

**Step 1: パッケージをインストール**

```bash
npm install @prisma/client @vercel/postgres
npm install -D prisma
```

**Step 2: Prisma を初期化**

```bash
npx prisma init --datasource-provider postgresql
```

これで `prisma/schema.prisma` と `.env` が作成される。`.env` は `.gitignore` に追加されていることを確認（create-next-app デフォルトでは含まれているはず）。

**Step 3: `prisma/schema.prisma` を上書き**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

model User {
  id        String        @id @default(cuid())
  email     String        @unique
  name      String?
  image     String?
  sessions  ChatSession[]
  createdAt DateTime      @default(now())
}

model ChatSession {
  id        String        @id @default(cuid())
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  title     String?
  areaName  String?
  areaCode  String?
  messages  ChatMessage[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([userId, createdAt(sort: Desc)])
}

model ChatMessage {
  id        String      @id @default(cuid())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String
  content   String
  areaCode  String?
  areaName  String?
  createdAt DateTime    @default(now())

  @@index([sessionId, createdAt])
}
```

**Step 4: `src/lib/db/prisma.ts` を作成（シングルトンクライアント）**

```typescript
// src/lib/db/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 5: `.env.local` に DB URL を追加**

```bash
# .env.local
POSTGRES_PRISMA_URL="postgres://..."     # Vercel Postgres ダッシュボードから取得
POSTGRES_URL_NON_POOLING="postgres://..."
```

> **注意:** Vercel Postgres がまだ存在しない場合は、`vercel postgres create` でローカル開発用DBを作るか、Supabase の無料枠を使って URL を設定する。開発中は `.env.local` に接続文字列を設定すれば OK。

**Step 6: マイグレーション実行**

```bash
npx prisma migrate dev --name init
```

**Step 7: Prisma Client 型を生成**

```bash
npx prisma generate
```

**Step 8: コミット**

```bash
git add prisma/ src/lib/db/prisma.ts package.json package-lock.json
git commit -m "feat: add Prisma + Vercel Postgres schema for chat history"
```

---

## Task 2: DB ユーティリティ

**Files:**
- Create: `src/lib/db/sessions.ts`
- Create: `src/lib/db/sessions.test.ts`

**Step 1: テストを書く**

```typescript
// src/lib/db/sessions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSession, getUserSessions, getSessionWithMessages, updateSessionTitle, deleteSession, saveMessages, findOrCreateUser } from './sessions'

// Prisma をモック
vi.mock('./prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
    chatSession: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    chatMessage: {
      createMany: vi.fn(),
    },
  },
}))

import { prisma } from './prisma'

describe('findOrCreateUser', () => {
  it('upserts a user by email', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', image: null, createdAt: new Date() }
    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser)

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
    const mockSession = { id: 'session-1', userId: 'user-1', title: null, areaName: '渋谷区', areaCode: '13113', messages: [], createdAt: new Date(), updatedAt: new Date() }
    vi.mocked(prisma.chatSession.create).mockResolvedValue(mockSession)

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
      { id: 's1', userId: 'user-1', title: '渋谷区の人口', areaName: '渋谷区', areaCode: '13113', createdAt: new Date(), updatedAt: new Date() },
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

describe('updateSessionTitle', () => {
  it('updates session title', async () => {
    const mockSession = { id: 's1', userId: 'u1', title: '新しいタイトル', areaName: null, areaCode: null, createdAt: new Date(), updatedAt: new Date() }
    vi.mocked(prisma.chatSession.update).mockResolvedValue(mockSession)

    await updateSessionTitle('s1', 'u1', '新しいタイトル')
    expect(prisma.chatSession.update).toHaveBeenCalledWith({
      where: { id: 's1', userId: 'u1' },
      data: { title: '新しいタイトル' },
    })
  })
})

describe('saveMessages', () => {
  it('inserts multiple messages', async () => {
    vi.mocked(prisma.chatMessage.createMany).mockResolvedValue({ count: 2 })

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
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/lib/db/sessions.test.ts
# FAIL - sessions not found
```

**Step 3: DB ユーティリティを実装**

```typescript
// src/lib/db/sessions.ts
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
    create: { email: params.email, name: params.name ?? undefined, image: params.image ?? undefined },
    update: { name: params.name ?? undefined, image: params.image ?? undefined },
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
  return prisma.chatSession.update({
    where: { id: sessionId, userId },
    data: { title },
  })
}

export async function deleteSession(sessionId: string, userId: string) {
  return prisma.chatSession.delete({
    where: { id: sessionId, userId },
  })
}

export async function saveMessages(sessionId: string, messages: MessageInput[]) {
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
```

**Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/lib/db/sessions.test.ts
# PASS
```

**Step 5: コミット**

```bash
git add src/lib/db/
git commit -m "feat: add Prisma DB utilities for chat session management"
```

---

## Task 3: API Routes (Sessions)

**Files:**
- Create: `src/app/api/sessions/route.ts`
- Create: `src/app/api/sessions/route.test.ts`
- Create: `src/app/api/sessions/[id]/route.ts`
- Create: `src/app/api/sessions/[id]/route.test.ts`
- Create: `src/app/api/sessions/[id]/messages/route.ts`
- Create: `src/app/api/sessions/[id]/messages/route.test.ts`

### 3a: `/api/sessions` (GET, POST)

**Step 1: テストを書く**

```typescript
// src/app/api/sessions/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
import { findOrCreateUser, createSession, getUserSessions } from '@/lib/db/sessions'

const makeRequest = (body?: unknown) =>
  new Request('http://localhost/api/sessions', {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
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
    vi.mocked(findOrCreateUser).mockResolvedValue({ id: 'u1', email: 'test@example.com', name: 'Test', image: null, createdAt: new Date() })
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
    vi.mocked(findOrCreateUser).mockResolvedValue({ id: 'u1', email: 'test@example.com', name: 'Test', image: null, createdAt: new Date() })
    vi.mocked(createSession).mockResolvedValue({
      id: 's1', userId: 'u1', title: null, areaName: '渋谷区', areaCode: '13113', createdAt: new Date(), updatedAt: new Date(),
    })

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
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/app/api/sessions/route.test.ts
# FAIL
```

**Step 3: `/api/sessions/route.ts` を実装**

```typescript
// src/app/api/sessions/route.ts
import { getAuthSession } from '@/lib/auth'
import { findOrCreateUser, createSession, getUserSessions } from '@/lib/db/sessions'

export async function GET() {
  const session = await getAuthSession()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await findOrCreateUser({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  })
  const sessions = await getUserSessions(user.id)
  return Response.json({ sessions })
}

export async function POST(req: Request) {
  const session = await getAuthSession()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { areaName, areaCode } = (await req.json()) as {
    areaName?: string
    areaCode?: string
  }

  const user = await findOrCreateUser({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  })
  const chatSession = await createSession(user.id, { areaName, areaCode })
  return Response.json({ session: chatSession })
}
```

**Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/app/api/sessions/route.test.ts
# PASS
```

### 3b: `/api/sessions/[id]` (GET, PATCH, DELETE)

**Step 5: テストを書く**

```typescript
// src/app/api/sessions/[id]/route.test.ts
import { describe, it, expect, vi } from 'vitest'
import { GET, PATCH, DELETE } from './route'

vi.mock('@/lib/auth', () => ({ getAuthSession: vi.fn() }))
vi.mock('@/lib/db/sessions', () => ({
  findOrCreateUser: vi.fn(),
  getSessionWithMessages: vi.fn(),
  updateSessionTitle: vi.fn(),
  deleteSession: vi.fn(),
}))

import { getAuthSession } from '@/lib/auth'
import { findOrCreateUser, getSessionWithMessages, updateSessionTitle, deleteSession } from '@/lib/db/sessions'

const params = Promise.resolve({ id: 's1' })

describe('GET /api/sessions/[id]', () => {
  it('returns 401 if not authenticated', async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/sessions/s1')
    const res = await GET(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns session with messages', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { email: 'a@b.com' }, expires: '' } as never)
    vi.mocked(findOrCreateUser).mockResolvedValue({ id: 'u1', email: 'a@b.com', name: null, image: null, createdAt: new Date() })
    vi.mocked(getSessionWithMessages).mockResolvedValue({
      id: 's1', userId: 'u1', title: null, areaName: null, areaCode: null,
      createdAt: new Date(), updatedAt: new Date(),
      messages: [
        { id: 'm1', sessionId: 's1', role: 'user', content: 'Hello', areaCode: null, areaName: null, createdAt: new Date() },
      ],
    })
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
    vi.mocked(findOrCreateUser).mockResolvedValue({ id: 'u1', email: 'a@b.com', name: null, image: null, createdAt: new Date() })
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
    vi.mocked(findOrCreateUser).mockResolvedValue({ id: 'u1', email: 'a@b.com', name: null, image: null, createdAt: new Date() })
    vi.mocked(deleteSession).mockResolvedValue({} as never)

    const req = new Request('http://localhost/api/sessions/s1', { method: 'DELETE' })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(200)
    expect(deleteSession).toHaveBeenCalledWith('s1', 'u1')
  })
})
```

**Step 6: テストが失敗することを確認**

```bash
npm run test:run -- "src/app/api/sessions/\[id\]/route.test.ts"
# FAIL
```

**Step 7: `/api/sessions/[id]/route.ts` を実装**

```typescript
// src/app/api/sessions/[id]/route.ts
import { getAuthSession } from '@/lib/auth'
import { findOrCreateUser, getSessionWithMessages, updateSessionTitle, deleteSession } from '@/lib/db/sessions'

type Params = { params: Promise<{ id: string }> }

async function getUser() {
  const session = await getAuthSession()
  if (!session?.user?.email) return null
  return findOrCreateUser({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  })
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const chatSession = await getSessionWithMessages(id, user.id)
  if (!chatSession) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ session: chatSession })
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { title } = (await req.json()) as { title: string }
  await updateSessionTitle(id, user.id, title)
  return Response.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await deleteSession(id, user.id)
  return Response.json({ ok: true })
}
```

**Step 8: テストが通ることを確認**

```bash
npm run test:run -- "src/app/api/sessions/\[id\]/route.test.ts"
# PASS
```

### 3c: `/api/sessions/[id]/messages` (POST)

**Step 9: テストを書く**

```typescript
// src/app/api/sessions/[id]/messages/route.test.ts
import { describe, it, expect, vi } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/auth', () => ({ getAuthSession: vi.fn() }))
vi.mock('@/lib/db/sessions', () => ({
  findOrCreateUser: vi.fn(),
  saveMessages: vi.fn(),
}))

import { getAuthSession } from '@/lib/auth'
import { findOrCreateUser, saveMessages } from '@/lib/db/sessions'

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
    vi.mocked(findOrCreateUser).mockResolvedValue({ id: 'u1', email: 'a@b.com', name: null, image: null, createdAt: new Date() })
    vi.mocked(saveMessages).mockResolvedValue({ count: 2 })

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
    expect(saveMessages).toHaveBeenCalledWith('s1', expect.arrayContaining([
      expect.objectContaining({ role: 'user', content: 'Hello' }),
    ]))
  })
})
```

**Step 10: テストが失敗することを確認**

```bash
npm run test:run -- "src/app/api/sessions/\[id\]/messages/route.test.ts"
# FAIL
```

**Step 11: `/api/sessions/[id]/messages/route.ts` を実装**

```typescript
// src/app/api/sessions/[id]/messages/route.ts
import { getAuthSession } from '@/lib/auth'
import { findOrCreateUser, saveMessages } from '@/lib/db/sessions'
import type { MessageInput } from '@/lib/db/sessions'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await getAuthSession()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await findOrCreateUser({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  })

  const { id } = await params
  const { messages } = (await req.json()) as { messages: MessageInput[] }
  await saveMessages(id, messages)
  return Response.json({ ok: true })
}
```

**Step 12: 全テストが通ることを確認**

```bash
npm run test:run
# PASS all
```

**Step 13: コミット**

```bash
git add src/app/api/sessions/
git commit -m "feat: add session management API routes"
```

---

## Task 4: react-resizable-panels による3カラムレイアウト

**Files:**
- Modify: `package.json`
- Create: `src/components/layout/ThreeColumnLayout.tsx`
- Create: `src/components/layout/ThreeColumnLayout.test.tsx`
- Modify: `src/app/page.tsx`

**Step 1: パッケージをインストール**

```bash
npm install react-resizable-panels
```

**Step 2: テストを書く**

```typescript
// src/components/layout/ThreeColumnLayout.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ThreeColumnLayout } from './ThreeColumnLayout'

describe('ThreeColumnLayout', () => {
  it('renders all three panels', () => {
    render(
      <ThreeColumnLayout
        sidebar={<div data-testid="sidebar">sidebar</div>}
        center={<div data-testid="center">center</div>}
        right={<div data-testid="right">right</div>}
      />
    )
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('center')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('renders without sidebar (2-column mode)', () => {
    render(
      <ThreeColumnLayout
        center={<div data-testid="center">center</div>}
        right={<div data-testid="right">right</div>}
      />
    )
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
    expect(screen.getByTestId('center')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })
})
```

**Step 3: テストが失敗することを確認**

```bash
npm run test:run -- src/components/layout/ThreeColumnLayout.test.tsx
# FAIL
```

**Step 4: `ThreeColumnLayout` を実装**

```typescript
// src/components/layout/ThreeColumnLayout.tsx
'use client'

import { ReactNode } from 'react'
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels'

interface ThreeColumnLayoutProps {
  sidebar?: ReactNode
  center: ReactNode
  right: ReactNode
}

export function ThreeColumnLayout({ sidebar, center, right }: ThreeColumnLayoutProps) {
  if (!sidebar) {
    return (
      <PanelGroup direction="horizontal" className="h-full w-full">
        <Panel defaultSize={60} minSize={30}>
          {center}
        </Panel>
        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/30 transition-colors" />
        <Panel defaultSize={40} minSize={25}>
          {right}
        </Panel>
      </PanelGroup>
    )
  }

  return (
    <PanelGroup direction="horizontal" className="h-full w-full">
      <Panel defaultSize={16} minSize={12} maxSize={28} collapsible>
        {sidebar}
      </Panel>
      <PanelResizeHandle className="w-1 bg-border hover:bg-primary/30 transition-colors" />
      <Panel defaultSize={52} minSize={25}>
        {center}
      </Panel>
      <PanelResizeHandle className="w-1 bg-border hover:bg-primary/30 transition-colors" />
      <Panel defaultSize={32} minSize={20}>
        {right}
      </Panel>
    </PanelGroup>
  )
}
```

**Step 5: テストが通ることを確認**

```bash
npm run test:run -- src/components/layout/ThreeColumnLayout.test.tsx
# PASS
```

**Step 6: コミット**

```bash
git add src/components/layout/ThreeColumnLayout.tsx src/components/layout/ThreeColumnLayout.test.tsx package.json package-lock.json
git commit -m "feat: add three-column resizable layout"
```

---

## Task 5: SessionSidebar コンポーネント

**Files:**
- Create: `src/components/session/SessionSidebar.tsx`
- Create: `src/components/session/SessionSidebar.test.tsx`

**Step 1: テストを書く**

```typescript
// src/components/session/SessionSidebar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SessionSidebar } from './SessionSidebar'

const mockSessions = [
  { id: 's1', title: '渋谷区の人口', areaName: '渋谷区', createdAt: new Date('2026-02-21') },
  { id: 's2', title: null, areaName: '新宿区', createdAt: new Date('2026-02-20') },
]

describe('SessionSidebar', () => {
  it('renders session list', () => {
    render(
      <SessionSidebar
        sessions={mockSessions}
        currentSessionId={null}
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
      />
    )
    expect(screen.getByText('渋谷区の人口')).toBeInTheDocument()
    // title が null の場合はエリア名を表示
    expect(screen.getByText('新宿区')).toBeInTheDocument()
  })

  it('calls onNewSession when new button is clicked', () => {
    const onNew = vi.fn()
    render(
      <SessionSidebar
        sessions={[]}
        currentSessionId={null}
        onNewSession={onNew}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /新しい会話/ }))
    expect(onNew).toHaveBeenCalled()
  })

  it('highlights current session', () => {
    render(
      <SessionSidebar
        sessions={mockSessions}
        currentSessionId="s1"
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
      />
    )
    const s1 = screen.getByText('渋谷区の人口').closest('button')
    expect(s1?.className).toContain('bg-')
  })

  it('calls onSelectSession when a session is clicked', () => {
    const onSelect = vi.fn()
    render(
      <SessionSidebar
        sessions={mockSessions}
        currentSessionId={null}
        onNewSession={vi.fn()}
        onSelectSession={onSelect}
        onDeleteSession={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('渋谷区の人口'))
    expect(onSelect).toHaveBeenCalledWith('s1')
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/components/session/SessionSidebar.test.tsx
# FAIL
```

**Step 3: `SessionSidebar` を実装**

```typescript
// src/components/session/SessionSidebar.tsx
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SessionItem {
  id: string
  title: string | null
  areaName: string | null
  createdAt: Date
}

interface SessionSidebarProps {
  sessions: SessionItem[]
  currentSessionId: string | null
  onNewSession: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
}: SessionSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      <div className="px-3 py-3 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={onNewSession}
          aria-label="新しい会話"
        >
          <Plus className="h-3.5 w-3.5" />
          新しい会話
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sessions.map((session) => {
          const label = session.title ?? session.areaName ?? '無題の会話'
          const isActive = session.id === currentSessionId
          return (
            <div
              key={session.id}
              className={`group flex items-center gap-1 mx-2 mb-0.5 rounded-md ${
                isActive ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              <button
                className="flex-1 min-w-0 px-2 py-1.5 text-left text-xs truncate"
                onClick={() => onSelectSession(session.id)}
              >
                {label}
              </button>
              <button
                aria-label="削除"
                className="shrink-0 p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteSession(session.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/components/session/SessionSidebar.test.tsx
# PASS
```

**Step 5: コミット**

```bash
git add src/components/session/
git commit -m "feat: add SessionSidebar component"
```

---

## Task 6: ChatPanel の保存フロー統合

**Files:**
- Modify: `src/components/chat/ChatPanel.tsx`
- Modify: `src/components/chat/ChatPanel.test.tsx`

**背景:** `useChat` (v3) の `status` が `'streaming'` → `'ready'` に変わるタイミングで `messages` の最後のAIメッセージが確定する。`useRef` で前の status を記録し、遷移を検知して保存 API を呼ぶ。

**Step 1: 既存テストが壊れていないことを確認**

```bash
npm run test:run -- src/components/chat/ChatPanel.test.tsx
# PASS (現状確認)
```

**Step 2: ChatPanel を更新**

```typescript
// src/components/chat/ChatPanel.tsx
'use client'

import { useState, useRef, useMemo, FormEvent, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import type { SelectedArea } from '@/lib/types'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import type { CategoryCoverageItem } from './CategoryCoverageChips'

interface ChatPanelProps {
  selectedArea: SelectedArea | null
  onAreaClear: () => void
  sessionId: string | null
  onSessionCreated: (id: string) => void
  onTitleGenerated: () => void
}

function extractTextContent(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => ('text' in p ? p.text : ''))
    .join('')
}

export function ChatPanel({
  selectedArea,
  onAreaClear,
  sessionId,
  onSessionCreated,
  onTitleGenerated,
}: ChatPanelProps) {
  const selectedAreaRef = useRef(selectedArea)
  selectedAreaRef.current = selectedArea
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId
  const [categories, setCategories] = useState<CategoryCoverageItem[]>([])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ selectedArea: selectedAreaRef.current }),
      }),
    []
  )

  const { messages, setMessages, sendMessage, status } = useChat({ transport })
  const [input, setInput] = useState('')
  const isLoading = status === 'submitted' || status === 'streaming'

  const prevStatus = useRef(status)
  const isSavingRef = useRef(false)

  // ストリーミング完了時にメッセージを保存
  useEffect(() => {
    const wasStreaming = prevStatus.current === 'streaming'
    const isReady = status === 'ready'
    prevStatus.current = status

    if (!wasStreaming || !isReady) return
    if (isSavingRef.current) return

    const currentSessionId = sessionIdRef.current
    if (!currentSessionId) return
    if (messages.length < 2) return

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    const lastAiMsg = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!lastUserMsg || !lastAiMsg) return

    isSavingRef.current = true

    const area = selectedAreaRef.current
    const messagesToSave = [
      {
        role: 'user',
        content: extractTextContent(lastUserMsg),
        areaCode: area?.code ?? null,
        areaName: area?.name ?? null,
      },
      {
        role: 'assistant',
        content: extractTextContent(lastAiMsg),
        areaCode: area?.code ?? null,
        areaName: area?.name ?? null,
      },
    ]

    fetch(`/api/sessions/${currentSessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messagesToSave }),
    })
      .then(() => {
        // 最初のAI応答のときだけタイトル生成
        if (messages.filter((m) => m.role === 'assistant').length === 1) {
          return generateTitle(currentSessionId, messagesToSave[0].content, messagesToSave[1].content)
            .then(onTitleGenerated)
        }
      })
      .finally(() => {
        isSavingRef.current = false
      })
  }, [status, messages, onTitleGenerated])

  useEffect(() => {
    let cancelled = false
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/statistics/categories')
        if (!res.ok) return
        const body = (await res.json()) as { categories?: CategoryCoverageItem[] }
        if (!cancelled && Array.isArray(body.categories)) setCategories(body.categories)
      } catch { /* ignore */ }
    }
    void fetchCategories()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return

    // 最初のメッセージ送信時にセッションを作成
    if (!sessionIdRef.current) {
      const area = selectedAreaRef.current
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ areaName: area?.name, areaCode: area?.code }),
        })
        if (res.ok) {
          const body = (await res.json()) as { session: { id: string } }
          onSessionCreated(body.session.id)
        }
      } catch { /* continue without saving */ }
    }

    sendMessage({ text: input })
    setInput('')
  }

  // セッション切り替え時にメッセージをリセット
  const prevSessionId = useRef(sessionId)
  useEffect(() => {
    if (prevSessionId.current !== sessionId) {
      prevSessionId.current = sessionId
      if (sessionId === null) {
        setMessages([])
      }
    }
  }, [sessionId, setMessages])

  return (
    <div className="flex flex-col h-full">
      <div
        data-testid="chat-panel-header"
        className="px-5 py-3 border-b border-border/60 bg-background bg-background/80 backdrop-blur"
      >
        <h1 className="font-medium text-sm text-foreground tracking-tight">ChatJapan</h1>
      </div>

      <MessageList messages={messages} />

      <ChatInput
        selectedArea={selectedArea}
        categories={categories}
        onAreaClear={onAreaClear}
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}

async function generateTitle(sessionId: string, userMsg: string, aiMsg: string): Promise<void> {
  try {
    const res = await fetch('/api/sessions/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userMsg, aiMsg }),
    })
    if (!res.ok) throw new Error()
  } catch {
    // タイトル生成失敗はサイレントに無視
  }
}
```

**Step 3: `ChatPanel.test.tsx` を更新（新しい props に対応）**

既存テストの `<ChatPanel selectedArea={null} onAreaClear={vi.fn()} />` を以下に変更:

```typescript
// src/components/chat/ChatPanel.test.tsx 内の describe ブロック全体を修正
describe('ChatPanel', () => {
  const defaultProps = {
    selectedArea: null,
    onAreaClear: vi.fn(),
    sessionId: null,
    onSessionCreated: vi.fn(),
    onTitleGenerated: vi.fn(),
  }

  it('renders chat input', () => {
    render(<ChatPanel {...defaultProps} />)
    expect(screen.getByPlaceholderText(/メッセージを入力/)).toBeInTheDocument()
  })

  it('renders send button', () => {
    render(<ChatPanel {...defaultProps} />)
    expect(screen.getByRole('button', { name: /送信/ })).toBeInTheDocument()
  })

  it('shows selected area context when area is selected', () => {
    render(
      <ChatPanel
        {...defaultProps}
        selectedArea={{ name: '渋谷区', code: '13113', prefCode: '13', level: 'municipality' }}
      />
    )
    expect(screen.getByText(/渋谷区/)).toBeInTheDocument()
  })

  it('shows placeholder message when no messages', () => {
    render(<ChatPanel {...defaultProps} />)
    expect(screen.getByText(/地図でエリアを選択/)).toBeInTheDocument()
  })
})
```

**Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/components/chat/ChatPanel.test.tsx
# PASS
```

**Step 5: コミット**

```bash
git add src/components/chat/ChatPanel.tsx src/components/chat/ChatPanel.test.tsx
git commit -m "feat: integrate session save flow into ChatPanel"
```

---

## Task 7: タイトル自動生成 API

**Files:**
- Create: `src/app/api/sessions/generate-title/route.ts`
- Create: `src/app/api/sessions/generate-title/route.test.ts`

**Step 1: テストを書く**

```typescript
// src/app/api/sessions/generate-title/route.test.ts
import { describe, it, expect, vi } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/auth', () => ({ getAuthSession: vi.fn() }))
vi.mock('@/lib/db/sessions', () => ({
  findOrCreateUser: vi.fn(),
  updateSessionTitle: vi.fn(),
}))
vi.mock('ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('ai')>()
  return { ...mod, generateText: vi.fn().mockResolvedValue({ text: '渋谷区の人口統計' }) }
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
    vi.mocked(findOrCreateUser).mockResolvedValue({ id: 'u1', email: 'a@b.com', name: null, image: null, createdAt: new Date() })
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
```

**Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/app/api/sessions/generate-title/route.test.ts
# FAIL
```

**Step 3: `generate-title/route.ts` を実装**

```typescript
// src/app/api/sessions/generate-title/route.ts
import { generateText } from 'ai'
import { getAuthSession } from '@/lib/auth'
import { findOrCreateUser, updateSessionTitle } from '@/lib/db/sessions'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

function getLLMModel() {
  const provider = process.env.LLM_PROVIDER ?? 'openai'
  if (provider === 'anthropic') {
    return anthropic(process.env.LLM_MODEL ?? 'claude-haiku-4-5-20251001')
  }
  return openai(process.env.LLM_MODEL ?? 'gpt-4o-mini')
}

export async function POST(req: Request) {
  const session = await getAuthSession()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await findOrCreateUser({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  })

  const { sessionId, userMsg, aiMsg } = (await req.json()) as {
    sessionId: string
    userMsg: string
    aiMsg: string
  }

  const { text } = await generateText({
    model: getLLMModel(),
    prompt: `以下の会話に対して、10文字以内の簡潔なタイトルを日本語で生成してください。タイトルのみを返してください。\n\nユーザー: ${userMsg}\nAI: ${aiMsg.slice(0, 200)}`,
    maxTokens: 30,
  })

  const title = text.trim().replace(/^["「]|["」]$/g, '')
  await updateSessionTitle(sessionId, user.id, title)
  return Response.json({ title })
}
```

**Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/app/api/sessions/generate-title/route.test.ts
# PASS
```

**Step 5: コミット**

```bash
git add src/app/api/sessions/generate-title/
git commit -m "feat: add LLM-based session title generation"
```

---

## Task 8: page.tsx 統合（全体を組み合わせる）

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: セッション状態管理フック `useSessionManager` を作成**

```typescript
// src/hooks/useSessionManager.ts
import { useState, useEffect, useCallback } from 'react'

interface SessionSummary {
  id: string
  title: string | null
  areaName: string | null
  createdAt: Date
}

export function useSessionManager(isLoggedIn: boolean) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const res = await fetch('/api/sessions')
      if (!res.ok) return
      const body = (await res.json()) as { sessions: SessionSummary[] }
      setSessions(body.sessions)
    } catch { /* ignore */ }
  }, [isLoggedIn])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  const startNewSession = useCallback(() => {
    setCurrentSessionId(null)
  }, [])

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id)
  }, [])

  const handleSessionCreated = useCallback((id: string) => {
    setCurrentSessionId(id)
    void fetchSessions()
  }, [fetchSessions])

  const handleTitleGenerated = useCallback(() => {
    void fetchSessions()
  }, [fetchSessions])

  const deleteSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (currentSessionId === id) setCurrentSessionId(null)
    } catch { /* ignore */ }
  }, [currentSessionId])

  return {
    sessions,
    currentSessionId,
    startNewSession,
    selectSession,
    handleSessionCreated,
    handleTitleGenerated,
    deleteSession,
  }
}
```

**Step 2: `useSessionManager` のテストを書く**

```typescript
// src/hooks/useSessionManager.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useSessionManager } from './useSessionManager'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useSessionManager', () => {
  it('does not fetch sessions when not logged in', () => {
    renderHook(() => useSessionManager(false))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches sessions when logged in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessions: [{ id: 's1', title: 'T1', areaName: null, createdAt: new Date() }] }),
    })
    const { result } = renderHook(() => useSessionManager(true))
    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
  })

  it('startNewSession clears currentSessionId', () => {
    const { result } = renderHook(() => useSessionManager(false))
    act(() => result.current.selectSession('s1'))
    expect(result.current.currentSessionId).toBe('s1')
    act(() => result.current.startNewSession())
    expect(result.current.currentSessionId).toBeNull()
  })
})
```

**Step 3: テストが通ることを確認**

```bash
npm run test:run -- src/hooks/useSessionManager.test.ts
# PASS
```

**Step 4: `page.tsx` を更新**

```typescript
// src/app/page.tsx
'use client'

import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout'
import { MapPanel } from '@/components/map/MapPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { SessionSidebar } from '@/components/session/SessionSidebar'
import { useMapSelection } from '@/hooks/useMapSelection'
import { useSessionManager } from '@/hooks/useSessionManager'
import { useSession } from 'next-auth/react'

export default function Home() {
  const { data: authSession } = useSession()
  const isLoggedIn = !!authSession?.user

  const {
    selectedArea,
    selectionMode,
    focusedPrefecture,
    selectArea,
    clearSelection,
    enterMunicipalityMode,
    exitMunicipalityMode,
  } = useMapSelection()

  const {
    sessions,
    currentSessionId,
    startNewSession,
    selectSession,
    handleSessionCreated,
    handleTitleGenerated,
    deleteSession,
  } = useSessionManager(isLoggedIn)

  const sidebar = isLoggedIn ? (
    <SessionSidebar
      sessions={sessions}
      currentSessionId={currentSessionId}
      onNewSession={startNewSession}
      onSelectSession={selectSession}
      onDeleteSession={deleteSession}
    />
  ) : undefined

  return (
    <ThreeColumnLayout
      sidebar={sidebar}
      center={
        <MapPanel
          selectedArea={selectedArea}
          onAreaSelect={selectArea}
          selectionMode={selectionMode}
          focusedPrefecture={focusedPrefecture}
          onEnterMunicipalityMode={enterMunicipalityMode}
          onExitMunicipalityMode={exitMunicipalityMode}
        />
      }
      right={
        <ChatPanel
          selectedArea={selectedArea}
          onAreaClear={clearSelection}
          sessionId={currentSessionId}
          onSessionCreated={handleSessionCreated}
          onTitleGenerated={handleTitleGenerated}
        />
      }
    />
  )
}
```

**Step 5: 全テストが通ることを確認**

```bash
npm run test:run
# PASS all
```

**Step 6: ビルドが通ることを確認**

```bash
npm run build
# ✓ Compiled successfully
```

**Step 7: コミット**

```bash
git add src/app/page.tsx src/hooks/useSessionManager.ts src/hooks/useSessionManager.test.ts
git commit -m "feat: integrate session management into main page with 3-column layout"
```

---

## 完了チェックリスト

- [ ] `npx prisma migrate dev` が成功
- [ ] `npm run test:run` が全 PASS
- [ ] `npm run build` がエラーなし
- [ ] ログインユーザーでチャットするとセッションがサイドバーに表示される
- [ ] タイトルが会話後に自動更新される
- [ ] セッションをクリックすると（将来的に）復元できる（Task 3 の GET /api/sessions/[id] は実装済み）
- [ ] 未ログイン時は2カラムレイアウトのまま
- [ ] パネルをドラッグしてリサイズできる

---

## 注意事項

- **Vercel Postgres**: `POSTGRES_PRISMA_URL` はプーリング接続URL、`POSTGRES_URL_NON_POOLING` は直接接続URL（マイグレーション用）。ローカル開発には Supabase 無料枠 or `prisma db push` でローカルDBを使う。
- **@ai-sdk/react v3**: `setMessages` が利用可能か確認が必要。メモリファイルには記載されていないので、ない場合は代わりに `key` prop でコンポーネントをリマウントしてメッセージリセットを実現する。
- **セッション復元**: 過去セッションを選択したときにメッセージを画面に表示する機能（`GET /api/sessions/[id]` で取得してUIにセットする）は、このプランでは API は実装済みだが UI への統合は含まれていない。必要であれば Task 8 を拡張する。
