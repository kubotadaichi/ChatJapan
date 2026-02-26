import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import type { SkillFormConfig } from '@/lib/types'

function getLLMModel() {
  const provider = process.env.LLM_PROVIDER ?? 'openai'
  if (provider === 'anthropic') return anthropic(process.env.LLM_MODEL ?? 'claude-sonnet-4-6')
  if (provider === 'google') return google(process.env.LLM_MODEL ?? 'gemini-2.0-flash')
  return openai(process.env.LLM_MODEL ?? 'gpt-4o')
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    formConfig: SkillFormConfig
    extraPrompt?: string
    parentSystemPrompt?: string
  }

  const { formConfig, extraPrompt, parentSystemPrompt } = body

  const outputFormatLabel: Record<SkillFormConfig['outputFormat'], string> = {
    report: '詳細レポート形式（見出し・段落・テーブル）',
    table: '比較テーブル中心',
    slide: 'Marpスライド形式（箇条書き3〜5項目/スライド）',
    bullets: '箇条書きサマリー',
  }

  const toneLabel: Record<SkillFormConfig['tone'], string> = {
    formal: '丁寧・公式文体',
    business: 'ビジネス向け・簡潔',
    casual: 'わかりやすい・フレンドリー',
  }

  const metaPrompt = `あなたはAIアシスタントのシステムプロンプトを作成する専門家です。
以下の設定情報に基づいて、ChatJapan（日本の政府統計データを使った分析AIチャット）のシステムプロンプトを日本語で作成してください。

## 設定情報
- 対象業界・テーマ: ${formConfig.targetIndustry}
- 想定ユーザー: ${formConfig.targetAudience}
- 出力形式: ${outputFormatLabel[formConfig.outputFormat]}
- 重視する指標: ${formConfig.keyMetrics.join('、')}
- 文体・トーン: ${toneLabel[formConfig.tone]}
${extraPrompt ? `- 追加指示: ${extraPrompt}` : ''}
${parentSystemPrompt ? `\n## 親スキルの指示（継承元）\n${parentSystemPrompt}\n\n上記を踏まえて、さらに特化したシステムプロンプトを作成してください。` : ''}

## 出力形式
- システムプロンプトのみを出力してください（説明文不要）
- 「あなたは」で始めること
- ## セクション構造（役割・ルール・出力フォーマット）を含めること
- エリアコンテキストセクションは含めないこと（別途自動付加される）`

  const { text } = await generateText({
    model: getLLMModel(),
    prompt: metaPrompt,
  })

  return NextResponse.json({ systemPrompt: text })
}
