'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Skill } from '@/lib/types'

export default function AdminSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])

  async function load() {
    const res = await fetch('/api/admin/skills')
    setSkills(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    const res = await fetch(`/api/admin/skills/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await load()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">スキル管理</h1>
        <Link href="/admin/skills/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新しいスキル
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        {skills.map((skill) => (
          <div key={skill.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{skill.icon ?? '📊'}</span>
                <span className="font-medium">{skill.name}</span>
                {!skill.isActive && <span className="text-xs text-muted-foreground">(非公開)</span>}
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/skills/${skill.id}/edit`}>
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(skill.id, skill.name)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {skill.children && skill.children.length > 0 && (
              <div className="mt-2 ml-6 space-y-1">
                {skill.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span>{child.icon ?? '📋'}</span>
                      <span>{child.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/admin/skills/${child.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(child.id, child.name)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {skills.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            スキルがまだありません。「新しいスキル」から作成してください。
          </p>
        )}
      </div>
    </div>
  )
}
