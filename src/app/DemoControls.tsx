import { listSeeds, type RecoverySeedId } from '../fixtures'
import styles from './DemoControls.module.css'

type DemoControlsProps = Readonly<{
  feedback: string | null
  onLoadSeed(seedId: RecoverySeedId): void
  onReset(): void
}>

export function DemoControls(props: DemoControlsProps) {
  const seeds = listSeeds()

  return (
    <section className={styles.panel} aria-labelledby="demo-controls-heading">
      <div className={styles.introduction}>
        <p className={styles.eyebrow}>Demo-only controls</p>
        <h2 id="demo-controls-heading">Demo controls</h2>
        <p>Replace local prototype state with one canonical deterministic seed.</p>
      </div>

      <div className={styles.controls}>
        <label className={styles.seedField}>
          <span>Canonical seed</span>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value !== '') {
                props.onLoadSeed(event.target.value as RecoverySeedId)
              }
            }}
          >
            <option value="" disabled>Choose a seed</option>
            {seeds.map((seed) => (
              <option key={seed.seedId} value={seed.seedId}>
                {seed.seedId} — {seed.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={props.onReset}>Reset demo</button>
      </div>

      <p className={styles.feedback} role="status" aria-live="polite">
        {props.feedback ?? 'No canonical seed selected.'}
      </p>
    </section>
  )
}
