import { FeedbackMessage } from './ui/FeedbackMessage'
import { formatBodyAssessmentDueMessage, type BodyAssessmentStatus } from '../lib/body-assessment-types'

export function PhysicalAssessmentBanner({ status }: { status: BodyAssessmentStatus | null }) {
  if (!status?.enabled || !status.is_due) return null

  const message = formatBodyAssessmentDueMessage(status)
  if (!message) return null

  return (
    <FeedbackMessage variant="warning" className="mb-4">
      {message}
    </FeedbackMessage>
  )
}
