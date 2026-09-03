import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentContext } from '../contexts/StudentContext'
import { useFeatureFlag } from '../hooks/useFeatureFlag'
import { initStudentPushRegistration } from '../lib/push-notifications'

/** Registra FCM no app nativo quando push está habilitado para a academia. */
export function StudentPushHandler() {
  const navigate = useNavigate()
  const { academyId, loading } = useStudentContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(academyId, 'module_notifications_push')

  useEffect(() => {
    if (loading || flagLoading || !enabled) return

    let cleanup = () => {}
    void initStudentPushRegistration(navigate).then((dispose) => {
      cleanup = dispose
    })

    return () => cleanup()
  }, [enabled, flagLoading, loading, navigate])

  return null
}
