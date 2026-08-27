import { Link, useLocation } from 'react-router-dom'

import type { CaseNavigationProjection, CaseStage } from './navigation'
import { applicationPath, withPreservedDemo } from './navigation'
import styles from './JourneyNavigation.module.css'

const STAGES = [
  { id: 'application', label: 'Application' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
  { id: 'payment', label: 'Payment' },
  { id: 'status', label: 'Status' },
] as const

export function JourneyNavigation(props: {
  projection: CaseNavigationProjection
  currentStage: CaseStage
}) {
  const location = useLocation()
  const activeStage = props.currentStage === 'eta' || props.currentStage === 'correction'
    ? 'status'
    : props.currentStage

  return (
    <nav className={styles.journey} aria-label="Application journey">
      <ol>
        {STAGES.map((stage) => {
          const isCurrent = activeStage === stage.id
          const isCompleted = props.projection.completed[stage.id]
          const available = props.projection.available[stage.id]
          const path = stage.id === 'application'
            ? applicationPath(props.projection.caseId)
            : applicationPath(props.projection.caseId, stage.id)
          const content = (
            <>
              <span className={styles.stageMarker} aria-hidden="true">
                {isCompleted ? '✓' : STAGES.findIndex(({ id }) => id === stage.id) + 1}
              </span>
              <span>{stage.label}</span>
              <span className={styles.stageState}>
                {isCurrent ? 'Current' : isCompleted ? 'Complete' : available ? 'Available' : 'Not available'}
              </span>
            </>
          )

          return (
            <li key={stage.id} data-current={isCurrent || undefined} data-completed={isCompleted || undefined}>
              {available ? (
                <Link
                  to={withPreservedDemo(path, location.search)}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {content}
                </Link>
              ) : (
                <span className={styles.unavailable}>{content}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
