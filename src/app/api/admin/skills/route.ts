import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const skills = await prisma.skill.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(skills)
}

export async function POST(req: Request) {
  const body = await req.json()
  const skill = await prisma.skill.create({
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
      sortOrder: body.sortOrder ?? 0,
    },
  })
  return NextResponse.json(skill, { status: 201 })
}
