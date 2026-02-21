import { getAuthSession } from '@/lib/auth'
import {
  deleteSession,
  findOrCreateUser,
  getSessionWithMessages,
  updateSessionTitle,
} from '@/lib/db/sessions'

type Params = { params: Promise<{ id: string }> }

async function getUser() {
  const session = await getAuthSession()
  if (!session?.user?.email) {
    return null
  }

  return findOrCreateUser({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  })
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const chatSession = await getSessionWithMessages(id, user.id)
  if (!chatSession) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json({ session: chatSession })
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { title } = (await req.json()) as { title: string }
  await updateSessionTitle(id, user.id, title)
  return Response.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await deleteSession(id, user.id)
  return Response.json({ ok: true })
}
