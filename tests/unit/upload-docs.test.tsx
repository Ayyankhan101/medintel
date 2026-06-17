import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n/client'
import { UploadDocs } from '@/components/intake/UploadDocs'

function W({ children }: { children: React.ReactNode }) { return <I18nProvider>{children}</I18nProvider> }

describe('<UploadDocs>', () => {
  const onRefined = vi.fn()

  it('renders collapsed accordion header', () => {
    render(<UploadDocs triageId="t-1" onRefined={onRefined} />, { wrapper: W })
    expect(screen.getByText(/Have lab reports or a prescription?/i)).toBeTruthy()
  })

  it('shows upload area when expanded', () => {
    render(<UploadDocs triageId="t-1" onRefined={onRefined} />, { wrapper: W })
    fireEvent.click(screen.getByText(/Have lab reports or a prescription?/i))
    expect(screen.getByText(/JPG\/PNG only, up to 3 files/i)).toBeTruthy()
    expect(screen.getByText(/Tap to browse files/i)).toBeTruthy()
  })

  it('shows error state when upload fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Analysis failed' })),
    }))
    const { container } = render(<UploadDocs triageId="t-1" onRefined={onRefined} />, { wrapper: W })
    fireEvent.click(screen.getByText(/Have lab reports or a prescription?/i))
    const input = container.querySelector('input[type="file"]')!
    Object.defineProperty(input, 'files', { value: [new File(['dummy'], 'test.png', { type: 'image/png' })] })
    fireEvent.change(input)
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /Re-analyse/i }).hasAttribute('disabled')).toBe(false)
    })
    fireEvent.click(screen.getByRole('button', { name: /Re-analyse/i }))
    await vi.waitFor(() => {
      expect(screen.getByText(/Analysis failed/i)).toBeTruthy()
    })
  })

  it('renders upload button disabled when no files', () => {
    render(<UploadDocs triageId="t-1" onRefined={onRefined} />, { wrapper: W })
    fireEvent.click(screen.getByText(/Have lab reports or a prescription?/i))
    expect(screen.getByRole('button', { name: /Re-analyse/i }).hasAttribute('disabled')).toBe(true)
  })
})
