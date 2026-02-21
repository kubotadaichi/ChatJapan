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
