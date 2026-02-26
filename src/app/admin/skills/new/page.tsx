import { prisma } from '@/lib/db'
import { SkillForm } from '@/components/admin/SkillForm'

export default async function NewSkillPage() {
  const parentSkills = await prisma.skill.findMany({
    where: { isActive: true, parentId: null },
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' },
  })

  return <SkillForm parentSkills={parentSkills} mode="create" />
}
