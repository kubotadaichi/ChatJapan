import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { SkillForm } from '@/components/admin/SkillForm'

export default async function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [skill, parentSkills] = await Promise.all([
    prisma.skill.findUnique({ where: { id } }),
    prisma.skill.findMany({
      where: { isActive: true, parentId: null, NOT: { id } },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  if (!skill) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SkillForm initialSkill={skill as any} parentSkills={parentSkills} mode="edit" />
}
