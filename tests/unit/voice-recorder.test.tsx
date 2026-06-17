import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n/client'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'

function W({ children }: { children: React.ReactNode }) { return <I18nProvider>{children}</I18nProvider> }

beforeEach(() => {
  vi.stubGlobal('MediaRecorder', vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    ondataavailable: null,
    onstop: null,
    onerror: null,
    mimeType: 'audio/webm',
    state: 'inactive',
  })))
  MediaRecorder.isTypeSupported = vi.fn(() => true)

  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
      }),
    },
  })
})

const onRecordingComplete = vi.fn()

describe('<VoiceRecorder>', () => {
  it('renders idle state with mic button', () => {
    render(<VoiceRecorder onRecordingComplete={onRecordingComplete} />, { wrapper: W })
    expect(screen.getByLabelText(/Start recording/i)).toBeTruthy()
  })

  it('renders language selector with all options', () => {
    render(<VoiceRecorder onRecordingComplete={onRecordingComplete} />, { wrapper: W })
    expect(screen.getByText('English')).toBeTruthy()
    expect(screen.getByText('اردو')).toBeTruthy()
  })

  it('shows language tip for default language (Urdu)', () => {
    render(<VoiceRecorder onRecordingComplete={onRecordingComplete} />, { wrapper: W })
    expect(screen.getByText(/اپنی علامات قدرتی طور پر بیان کریں/i)).toBeTruthy()
  })

  it('renders "describe your symptoms" prompt', () => {
    render(<VoiceRecorder onRecordingComplete={onRecordingComplete} />, { wrapper: W })
    expect(screen.getByText(/Tap the mic and describe your symptoms/i)).toBeTruthy()
  })

  it('handles microphone permission error gracefully', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }),
        ),
      },
    })
    render(<VoiceRecorder onRecordingComplete={onRecordingComplete} />, { wrapper: W })
    const btn = screen.getByLabelText(/Start recording/i)
    btn.click()
    await vi.waitFor(() => {
      expect(screen.getByText(/Microphone permission denied/i)).toBeTruthy()
    })
  })

  it('handles no microphone error', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error('Not found'), { name: 'NotFoundError' }),
        ),
      },
    })
    render(<VoiceRecorder onRecordingComplete={onRecordingComplete} />, { wrapper: W })
    const btn = screen.getByLabelText(/Start recording/i)
    btn.click()
    await vi.waitFor(() => {
      expect(screen.getByText(/No microphone found/i)).toBeTruthy()
    })
  })
})
