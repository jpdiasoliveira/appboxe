import { useEffect, useMemo, useState } from 'react'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { DashboardDayPanel } from './components/DashboardDayPanel'
import {
  DashboardMiniCalendar,
  monthRangeIso,
} from './components/DashboardMiniCalendar'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import type { StudentBirthdayEntry } from '../../lib/academy-types'
import { dateKey } from '../../lib/schedule-utils'
import { fetchAcademyClassSessions } from '../schedule/schedule-api'

interface AcademyDashboardSidebarProps {
  academyId: string | null
  birthdays: StudentBirthdayEntry[]
}

export function AcademyDashboardSidebar({ academyId, birthdays }: AcademyDashboardSidebarProps) {
  const { enabled: showSchedule } = useFeatureFlag(academyId, 'module_class_schedule')
  const [monthAnchor, setMonthAnchor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchAcademyClassSessions>>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!academyId || !showSchedule) {
      setSessions([])
      return
    }
    const { from, to } = monthRangeIso(monthAnchor)
    fetchAcademyClassSessions(academyId, from, to)
      .then(setSessions)
      .catch((e: Error) => setError(e.message))
  }, [academyId, monthAnchor, showSchedule])

  const sessionDates = useMemo(() => {
    const set = new Set<string>()
    for (const session of sessions) {
      set.add(session.starts_at.slice(0, 10))
    }
    return set
  }, [sessions])

  if (!academyId) return null

  return (
    <aside className="space-y-4 xl:sticky xl:top-6">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      <DashboardMiniCalendar
        monthAnchor={monthAnchor}
        selectedDate={selectedDate}
        birthdays={birthdays}
        sessionDates={sessionDates}
        onMonthChange={setMonthAnchor}
        onSelectDate={setSelectedDate}
      />
      <DashboardDayPanel
        selectedDate={selectedDate}
        birthdays={birthdays}
        sessions={sessions}
        showSchedule={showSchedule}
      />
    </aside>
  )
}
