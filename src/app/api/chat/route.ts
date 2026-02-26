import { streamText, stepCountIs, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { createStatisticsTools } from '@/lib/llm/tools'
import type { SelectedArea } from '@/lib/types'
import { getSystemPrompt, type AgentMode } from '@/lib/llm/prompts'
import { buildSkillSystemPrompt, resolveSkillCategories } from '@/lib/llm/skills'
import { prisma } from '@/lib/db'

function getLLMModel() {
  const provider = process.env.LLM_PROVIDER ?? 'openai'

  if (provider === 'anthropic') {
    return anthropic(process.env.LLM_MODEL ?? 'claude-sonnet-4-6')
  }
  if (provider === 'google') {
    return google(process.env.LLM_MODEL ?? 'gemini-2.0-flash')
  }
  return openai(process.env.LLM_MODEL ?? 'gpt-4o')
}

export async function POST(req: Request) {
  const { messages, selectedAreas, agentMode = 'default', skillId } = (await req.json()) as {
    messages: UIMessage[]
    selectedAreas?: SelectedArea[]
    agentMode?: AgentMode
    skillId?: string
  }

  const estatApiKey = process.env.ESTAT_API_KEY
  if (!estatApiKey) {
    return Response.json({ error: 'ESTAT_API_KEY is not configured' }, { status: 500 })
  }

  const areaContext =
    selectedAreas && selectedAreas.length > 0
      ? `選択中のエリア（${selectedAreas.length}件）:\n` +
        selectedAreas
          .map((a, i) => `${i + 1}. ${a.name} (コード: ${a.code}, 都道府県コード: ${a.prefCode})`)
          .join('\n')
      : '特定のエリアは選択されていません。ユーザーに地図でエリアを選択するよう案内してください。'

  let systemPrompt: string
  let categoryFilter: string[] | null = null

  if (skillId) {
    const skill = await prisma.skill.findFirst({
      where: { id: skillId, isActive: true },
      include: { parent: true },
    })
    if (skill) {
      systemPrompt = buildSkillSystemPrompt(skill, areaContext)
      categoryFilter = resolveSkillCategories(skill)
    } else {
      systemPrompt = getSystemPrompt(agentMode, areaContext)
    }
  } else {
    systemPrompt = getSystemPrompt(agentMode, areaContext)
  }

  const tools = createStatisticsTools(estatApiKey, categoryFilter)

  const result = streamText({
    model: getLLMModel(),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
