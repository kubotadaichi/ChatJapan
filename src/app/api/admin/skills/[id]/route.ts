import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const skill = await prisma.skill.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      icon: body.icon ?? null,
      parentId: body.parentId ?? null,
      formConfig: body.formConfig,
      extraPrompt: body.extraPrompt ?? null,
      systemPrompt: body.systemPrompt,
      statsCategories: body.statsCategories ?? [],
      customStatsIds: body.customStatsIds ?? [],
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    },
  })

  return NextResponse.json(skill)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const childCount = await prisma.skill.count({ where: { parentId: id } })

  if (childCount > 0) {
    return NextResponse.json(
      { error: `子スキルが${childCount}件あります。先に削除してください。` },
      { status: 400 }
    )
  }

  await prisma.skill.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
