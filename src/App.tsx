import styles from './App.module.css'

function App() {
  return (
    <main className={styles.foundationShell}>
      <p className={styles.prototypeNotice} role="note">
        UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION
      </p>
      <section className={styles.foundationStatus} aria-labelledby="project-heading">
        <h1 id="project-heading">India e-Visa Reimagined</h1>
        <p>Application foundation initialized. Product implementation has not started.</p>
      </section>
    </main>
  )
}

export default App
