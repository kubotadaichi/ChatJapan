import { streamText, stepCountIs, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createStatisticsTools } from '@/lib/llm/tools'
import type { SelectedArea } from '@/lib/types'

function getLLMModel() {
  const provider = process.env.LLM_PROVIDER ?? 'openai'

  if (provider === 'anthropic') {
    return anthropic(process.env.LLM_MODEL ?? 'claude-sonnet-4-6')
  }
  return openai(process.env.LLM_MODEL ?? 'gpt-4o')
}

export async function POST(req: Request) {
  const { messages, selectedArea } = (await req.json()) as {
    messages: UIMessage[]
    selectedArea?: SelectedArea
  }

  const estatApiKey = process.env.ESTAT_API_KEY
  if (!estatApiKey) {
    return Response.json({ error: 'ESTAT_API_KEY is not configured' }, { status: 500 })
  }

  const areaContext = selectedArea
    ? `選択中のエリア: ${selectedArea.name} (コード: ${selectedArea.code}, 都道府県コード: ${selectedArea.prefCode})`
    : '特定のエリアは選択されていません。ユーザーに地図でエリアを選択するよう案内してください。'

  const tools = createStatisticsTools(estatApiKey)

  const result = streamText({
    model: getLLMModel(),
    system: `あなたは日本の統計データを専門とするアシスタントです。
e-Stat（政府統計ポータル）のデータを使用して、ユーザーの質問に回答します。
必要に応じてツールを呼び出してデータを取得してください。

${areaContext}

回答は日本語で、分かりやすく具体的に提供してください。
coverageMismatch または note が返ってきた場合は、要求レベルと実際に利用したデータレベルの差分を明示して回答してください。
データが古い場合や取得できない場合は、その旨を明示してください。`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
