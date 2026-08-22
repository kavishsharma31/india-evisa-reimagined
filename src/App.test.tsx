import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('foundation shell', () => {
  it('renders the approved neutral foundation content', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'India e-Visa Reimagined' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION',
        { exact: true },
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Application foundation initialized. Product implementation has not started.',
        { exact: true },
      ),
    ).toBeInTheDocument()
  })
})
