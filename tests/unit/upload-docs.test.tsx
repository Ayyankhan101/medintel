import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UploadDocs } from '@/components/intake/UploadDocs'

describe('<UploadDocs>', () => {
  const onRefined = vi.fn()

  it('renders collapsed accordion header', () => {
    render(<UploadDocs triageId="t-1" onRefined={onRefined} />)
    expect(screen.getByText(/Have lab reports or a prescription?/i)).toBeTruthy()
  })

  it('shows upload area when expanded', () => {
    render(<UploadDocs triageId="t-1" onRefined={onRefined} />)
    fireEvent.click(screen.getByText(/Have lab reports or a prescription?/i))
    expect(screen.getByText(/JPG\/PNG only, up to 3 files/i)).toBeTruthy()
    expect(screen.getByText(/Tap to browse files/i)).toBeTruthy()
  })

  it('shows error state when upload fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Analysis failed' })),
    }))
    const { container } = render(<UploadDocs triageId="t-1" onRefined={onRefined} />)
    fireEvent.click(screen.getByText(/Have lab reports or a prescription?/i))

    const file = new File(['dummy'], 'test.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]')!
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    fireEvent.click(screen.getByText(/Re-analyse with these documents/i))
    expect(await screen.findByText(/Analysis failed/i)).toBeTruthy()
  })

  it('renders upload button disabled when no files', () => {
    render(<UploadDocs triageId="t-1" onRefined={onRefined} />)
    fireEvent.click(screen.getByText(/Have lab reports or a prescription?/i))
    expect(screen.getByText(/Re-analyse with these documents/i).closest('button')!.disabled).toBe(true)
  })
})
