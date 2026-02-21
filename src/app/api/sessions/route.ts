import { getAuthSession } from '@/lib/auth'
import { createSession, findOrCreateUser, getUserSessions } from '@/lib/db/sessions'

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
