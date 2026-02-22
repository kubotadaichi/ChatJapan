import { streamText, stepCountIs, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { createStatisticsTools } from '@/lib/llm/tools'
import type { SelectedArea } from '@/lib/types'
import { getSystemPrompt, type AgentMode } from '@/lib/llm/prompts'

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
  const { messages, selectedAreas, agentMode = 'default' } = (await req.json()) as {
    messages: UIMessage[]
    selectedAreas?: SelectedArea[]
    agentMode?: AgentMode
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

  const tools = createStatisticsTools(estatApiKey)
  const systemPrompt = getSystemPrompt(agentMode, areaContext)

  const result = streamText({
    model: getLLMModel(),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
