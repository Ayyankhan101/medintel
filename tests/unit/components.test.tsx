import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeverityBadge } from '@/components/triage/SeverityBadge'
import { I18nProvider } from '@/lib/i18n/client'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('<SeverityBadge>', () => {
  it('renders the Routine label + score for low severity', () => {
    render(<SeverityBadge score={2} level="ROUTINE" />, { wrapper: Wrapper })
    expect(screen.getByText(/Routine|معمول/)).toBeTruthy()
    expect(screen.getByText(/2\/10/)).toBeTruthy()
  })

  it('uses critical styling for CRITICAL', () => {
    const { container } = render(<SeverityBadge score={9} level="CRITICAL" />, { wrapper: Wrapper })
    const root = container.querySelector('span')
    expect(root?.className).toContain('bg-red-100')
    expect(screen.getByText(/Critical|نازک/)).toBeTruthy()
    expect(screen.getByText(/9\/10/)).toBeTruthy()
  })

  it('handles edge score values', () => {
    render(<SeverityBadge score={0} level="ROUTINE" />, { wrapper: Wrapper })
    expect(screen.getByText(/0\/10/)).toBeTruthy()
  })
})
