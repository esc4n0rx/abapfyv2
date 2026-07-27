import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles, Trash2, Upload } from 'lucide-react'
import { ImportSkillModal } from '@renderer/components/ImportSkillModal'
import { useSkillsStore } from '@renderer/store/skillsStore'
import { SKILL_CATEGORY_LABELS, type SkillCategory } from '@renderer/lib/skillsCatalog'
import './SkillsScreen.css'

type CategoryFilter = SkillCategory | 'custom' | 'all'

export function SkillsScreen(): JSX.Element {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [importOpen, setImportOpen] = useState(false)

  const { skills, loaded, load, toggleSkill, importSkill, removeSkill } = useSkillsStore(
    (state) => ({
      skills: state.skills,
      loaded: state.loaded,
      load: state.load,
      toggleSkill: state.toggleSkill,
      importSkill: state.importSkill,
      removeSkill: state.removeSkill
    })
  )

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  const availableCategories = useMemo(() => {
    const categories = new Set<SkillCategory>()
    skills.forEach((skill) => {
      if (skill.category) categories.add(skill.category)
    })
    return Array.from(categories)
  }, [skills])

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase()
    return skills.filter((skill) => {
      const matchesCategory =
        category === 'all' ||
        (category === 'custom' ? !skill.isBuiltin : skill.category === category)
      if (!matchesCategory) return false
      if (!query) return true
      return (
        skill.name.toLowerCase().includes(query) ||
        (skill.description ?? '').toLowerCase().includes(query)
      )
    })
  }, [skills, search, category])

  const enabledCount = skills.filter((skill) => skill.enabled).length

  return (
    <div className="skills-screen">
      <div className="skills-header">
        <div>
          <h1 className="skills-title">Skills</h1>
          <p className="skills-subtitle">
            Ative as skills que a Abapfy pode usar. {enabledCount} de {skills.length} ativas — ainda
            não conectadas ao modelo.
          </p>
        </div>
        <button type="button" className="skills-import-btn" onClick={() => setImportOpen(true)}>
          <Upload size={14} strokeWidth={1.75} />
          Importar skill
        </button>
      </div>

      <div className="skills-toolbar">
        <div className="skills-search">
          <Search size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Buscar skills…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="skills-filters">
          <button
            type="button"
            className={`skills-filter-chip ${category === 'all' ? 'skills-filter-chip-active' : ''}`}
            onClick={() => setCategory('all')}
          >
            Todas
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`skills-filter-chip ${category === cat ? 'skills-filter-chip-active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {SKILL_CATEGORY_LABELS[cat]}
            </button>
          ))}
          <button
            type="button"
            className={`skills-filter-chip ${category === 'custom' ? 'skills-filter-chip-active' : ''}`}
            onClick={() => setCategory('custom')}
          >
            Importadas
          </button>
        </div>
      </div>

      <div className="skills-grid">
        {filteredSkills.length === 0 ? (
          <div className="skills-empty">
            <Sparkles size={28} strokeWidth={1.25} />
            <p>Nenhuma skill encontrada.</p>
          </div>
        ) : (
          filteredSkills.map((skill) => (
            <div key={skill.slug} className="skill-card">
              <div className="skill-card-header">
                <div className="skill-card-title-row">
                  <span className="skill-card-name" title={skill.name}>
                    {skill.name}
                  </span>
                  {!skill.isBuiltin && <span className="skill-card-custom-badge">Importada</span>}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={skill.enabled}
                  className={`skill-toggle ${skill.enabled ? 'skill-toggle-on' : ''}`}
                  onClick={() => toggleSkill(skill.slug)}
                >
                  <span className="skill-toggle-thumb" />
                </button>
              </div>

              {skill.category && (
                <span className="skill-card-category">{SKILL_CATEGORY_LABELS[skill.category]}</span>
              )}

              <p className="skill-card-summary" title={skill.description ?? undefined}>
                {skill.description}
              </p>

              {!skill.isBuiltin && (
                <button
                  type="button"
                  className="skill-card-remove"
                  onClick={() => removeSkill(skill.slug)}
                >
                  <Trash2 size={12} strokeWidth={1.75} />
                  Remover
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <ImportSkillModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={importSkill}
      />
    </div>
  )
}
