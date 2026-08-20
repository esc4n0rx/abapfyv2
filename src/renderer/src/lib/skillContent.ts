import type { SkillItem } from '@renderer/store/skillsStore'

// Carrega sob demanda (só quando a skill é roteada pra sessão, no máximo 5 por
// mensagem — ver routeConversation em HomeScreen.tsx), em vez de empacotar as
// 32 skills built-in (~500KB de SKILL.md) inteiras no bundle de startup.
const skillModules = import.meta.glob('/src/skills/*/skills/*/SKILL.md', {
  query: '?raw',
  import: 'default'
}) as Record<string, () => Promise<string>>

const MAX_SKILL_CHARS = 8000

function truncate(content: string): string {
  return content.length > MAX_SKILL_CHARS
    ? `${content.slice(0, MAX_SKILL_CHARS)}\n\n…(conteúdo truncado — skill completa é maior que isso)`
    : content
}

/**
 * Conteúdo real de uma skill roteada pra sessão — antes disso o modelo só
 * recebia nome+descrição (uma linha), o SKILL.md/conteúdo importado inteiro
 * nunca chegava a ser enviado. Builtin lê o SKILL.md correspondente do
 * bundle; importada pelo usuário já tem o markdown em `contentMd`.
 */
export async function loadSkillContent(skill: SkillItem): Promise<string | null> {
  if (!skill.isBuiltin) return skill.contentMd ? truncate(skill.contentMd) : null

  const path = `/src/skills/${skill.slug}/skills/${skill.slug}/SKILL.md`
  const loader = skillModules[path]
  if (!loader) return null

  try {
    const raw = await loader()
    return truncate(raw)
  } catch {
    return null
  }
}
