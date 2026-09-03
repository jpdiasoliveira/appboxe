import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage, type FeedbackVariant } from '../../components/ui/FeedbackMessage'
import { useStudentContext } from '../../contexts/StudentContext'
import { fetchAllCategories, fetchStudentDashboard, setStudentCategories } from './student-api'

export function ModalitiesPage() {
  const { student } = useStudentContext()
  const [categories, setCategories] = useState<{ id: string; name: string; color: string | null }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [maxCategories, setMaxCategories] = useState(3)
  const [feedback, setFeedback] = useState<{ variant: FeedbackVariant; message: string } | null>(null)

  useEffect(() => {
    if (!student) return
    fetchAllCategories(student.academy_id).then(setCategories)
    fetchStudentDashboard(student.id).then((d) => {
      setSelected(new Set(d.categories.map((c) => c.id)))
      setMaxCategories(d.subscription?.plan?.max_categories ?? 3)
    })
  }, [student])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < maxCategories) next.add(id)
      return next
    })
  }

  async function save() {
    if (!student) return
    try {
      await setStudentCategories(student.id, [...selected])
      setFeedback({ variant: 'success', message: 'Modalidades salvas.' })
    } catch (e) {
      setFeedback({
        variant: 'error',
        message: e instanceof Error ? e.message : 'Erro',
      })
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">Modalidades</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Escolha até {maxCategories} modalidade(s).
      </p>
      <ul className="mb-6 space-y-2">
        {categories.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: c.color ?? '#B91C1C' }}
              />
              <span>{c.name}</span>
            </label>
          </li>
        ))}
      </ul>
      {feedback ? (
        <FeedbackMessage variant={feedback.variant} className="mb-4">
          {feedback.message}
        </FeedbackMessage>
      ) : null}
      <Button onClick={save}>Salvar modalidades</Button>
    </div>
  )
}
