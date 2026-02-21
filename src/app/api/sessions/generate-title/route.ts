import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { getAuthSession } from '@/lib/auth'
import { findOrCreateUser, updateSessionTitle } from '@/lib/db/sessions'

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
