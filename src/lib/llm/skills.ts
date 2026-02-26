type SkillPromptSource = {
  systemPrompt: string
  statsCategories: string[]
  parent?: {
    systemPrompt: string
    statsCategories: string[]
  } | null
}

/**
 * スキルのsystemPromptを構築する。
 * 親スキルがある場合は親のプロンプト -> 子のプロンプトの順で結合する。
 */
export function buildSkillSystemPrompt(
  skill: SkillPromptSource,
  areaContext: string
): string {
  const parts: string[] = []

  if (skill.parent?.systemPrompt) {
    parts.push(skill.parent.systemPrompt)
  }
  parts.push(skill.systemPrompt)
  parts.push(`\n## エリアコンテキスト\n${areaContext}`)

  return parts.join('\n\n---\n\n')
}

/**
 * スキルが使う統計カテゴリIDを解決する。
 * 子スキルが空なら親を継承し、親もなければ全カテゴリ。
 */
export function resolveSkillCategories(skill: SkillPromptSource): string[] | null {
  if (skill.statsCategories.length > 0) return skill.statsCategories
  if (skill.parent && skill.parent.statsCategories.length > 0) {
    return skill.parent.statsCategories
  }
  return null // null = 全カテゴリ使用
}
