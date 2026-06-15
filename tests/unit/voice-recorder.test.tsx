import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'

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

  vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => ({
    createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
    createAnalyser: vi.fn(() => ({
      frequencyBinCount: 128,
      getByteTimeDomainData: vi.fn(),
      connect: vi.fn(),
    })),
    state: 'running',
    close: vi.fn().mockResolvedValue(undefined),
  })))
  ;(window as unknown as { webkitAudioContext: unknown }).webkitAudioContext = undefined
})

describe('<VoiceRecorder>', () => {
  it('renders idle state with mic button', () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />)
    expect(screen.getByLabelText(/Start recording/i)).toBeTruthy()
  })

  it('renders language selector with all options', () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />)
    expect(screen.getByLabelText('Select language')).toBeTruthy()
    expect(screen.getByText(/اردو/)).toBeTruthy()
    const eng = screen.getAllByText(/English/)
    expect(eng.length).toBeGreaterThan(0)
  })

  it('shows language tip for default language (Urdu)', () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />)
    expect(screen.getByText(/اپنی علامات/)).toBeTruthy()
  })

  it('renders "describe your symptoms" prompt', () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />)
    expect(screen.getByText(/describe your symptoms/i)).toBeTruthy()
  })

  it('handles microphone permission error gracefully', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue({ name: 'NotAllowedError' }),
      },
    })
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />)
    screen.getByLabelText(/Start recording/i).click()
    expect(await screen.findByText(/Microphone permission denied/i)).toBeTruthy()
  })

  it('handles no microphone error', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue({ name: 'NotFoundError' }),
      },
    })
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />)
    screen.getByLabelText(/Start recording/i).click()
    expect(await screen.findByText(/No microphone found/i)).toBeTruthy()
  })
})
