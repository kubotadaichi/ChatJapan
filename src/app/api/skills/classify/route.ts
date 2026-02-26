import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { prisma } from '@/lib/db'

function getLLMModel() {
  const provider = process.env.LLM_PROVIDER ?? 'openai'
  if (provider === 'anthropic') return anthropic(process.env.LLM_MODEL ?? 'claude-sonnet-4-6')
  if (provider === 'google') return google(process.env.LLM_MODEL ?? 'gemini-2.0-flash')
  return openai(process.env.LLM_MODEL ?? 'gpt-4o')
}

export async function POST(req: Request) {
  const { message } = (await req.json()) as { message: string }

  const skills = await prisma.skill.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true },
  })

  if (skills.length === 0) {
    return NextResponse.json({
      skillId: null,
      confidence: 0,
      reason: 'スキルが登録されていません',
    })
  }

  const skillList = skills
    .map((s) => `- id: ${s.id}, 名前: ${s.name}, 説明: ${s.description}`)
    .join('\n')

  try {
    const { object } = await generateObject({
      model: getLLMModel(),
      schema: z.object({
        skillId: z.string().nullable(),
        confidence: z.number().min(0).max(1),
        reason: z.string(),
      }),
      prompt: `以下のユーザーメッセージに最も適したスキルを選んでください。
適切なスキルがない場合はskillIdをnullにしてください。

## ユーザーメッセージ
${message}

## 利用可能なスキル
${skillList}

## 判断基準
- confidence: 0.0〜1.0（0.5未満は「該当なし」と判断される）
- 業界・テーマがメッセージと強く一致する場合に高いconfidenceをつける`,
    })
    return NextResponse.json(object)
  } catch {
    return NextResponse.json({ skillId: null, confidence: 0, reason: '分類に失敗しました' })
  }
}
