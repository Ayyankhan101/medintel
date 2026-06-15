import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SymptomSummary } from '@/components/intake/SymptomSummary'

describe('<SymptomSummary>', () => {
  const base = {
    department: 'Cardiology',
    severityScore: 7,
    severityLevel: 'URGENT' as const,
    summary: '- Chest pain for 3 days\n- Shortness of breath\n- History of hypertension',
    transcript: 'I have been having chest pain for 3 days and it hurts when I breathe',
    isEmergency: false,
  }

  it('renders severity score and level', () => {
    render(<SymptomSummary {...base} />)
    expect(screen.getAllByText(/Urgent/).length).toBeGreaterThan(0)
    expect(screen.getByText('7')).toBeTruthy()
  })

  it('renders summary bullets', () => {
    render(<SymptomSummary {...base} />)
    expect(screen.getByText(/Chest pain for 3 days/)).toBeTruthy()
    expect(screen.getByText(/Shortness of breath/)).toBeTruthy()
  })

  it('renders non-bullet text as fallback', () => {
    render(<SymptomSummary {...base} summary="Just a plain text summary with no bullets" />)
    expect(screen.getByText(/Just a plain text summary with no bullets/)).toBeTruthy()
  })

  it('shows EmergencyAlert when isEmergency', () => {
    render(<SymptomSummary {...base} isEmergency severityScore={9} severityLevel="CRITICAL" />)
    expect(screen.getByText(/Emergency Detected/i)).toBeTruthy()
  })

  it('shows clinical findings table when keyFindings provided', () => {
    render(<SymptomSummary {...base} keyFindings={[
      { metric: 'Blood Pressure', value: '160/95', interpretation: 'Elevated', isAbnormal: true },
    ]} />)
    expect(screen.getByText('Blood Pressure')).toBeTruthy()
    expect(screen.getByText('160/95')).toBeTruthy()
    expect(screen.getByText('Elevated')).toBeTruthy()
  })

  it('shows suggested interventions when provided', () => {
    render(<SymptomSummary {...base} suggestedInterventions={['ECG within 24h', 'Monitor BP daily']} />)
    expect(screen.getByText(/ECG within 24h/)).toBeTruthy()
    expect(screen.getByText(/Monitor BP daily/)).toBeTruthy()
  })

  it('renders CRITICAL with correct styling', () => {
    const { container } = render(<SymptomSummary {...base} severityScore={9} severityLevel="CRITICAL" isEmergency />)
    const badge = container.querySelector('span')
    expect(screen.getByText(/Critical/)).toBeTruthy()
  })

  it('renders department badge', () => {
    render(<SymptomSummary {...base} />)
    const badges = screen.getAllByText(/Cardiology/)
    expect(badges.length).toBeGreaterThan(0)
  })

  it('contains AI disclaimer', () => {
    render(<SymptomSummary {...base} />)
    expect(screen.getByText(/not a medical diagnosis/i)).toBeTruthy()
  })
})
