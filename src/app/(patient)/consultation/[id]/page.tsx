'use client'
import { useEffect, useState, use } from 'react'
import { VideoCall } from '@/components/consultation/VideoCall'
import { PaymentFlow } from '@/components/escrow/PaymentFlow'

type Phase = 'loading' | 'payment' | 'waiting' | 'call' | 'done'

interface AppointmentData {
  id: string
  escrow?: { status: string } | null
  doctor: { specialization: string; consultationFee: string | number }
}

export default function PatientConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: appointmentId } = use(params)
  const [phase, setPhase]         = useState<Phase>('loading')
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [videoToken, setVideoToken] = useState<string | null>(null)
  const [roomName, setRoomName]     = useState('')
  const [error, setError]           = useState('')

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}`)
      .then(r => r.json())
      .then(data => {
        setAppointment(data)
        setPhase(data.escrow?.status === 'HELD' ? 'waiting' : 'payment')
      })
      .catch(() => setError('Could not load appointment'))
  }, [appointmentId])

  async function joinCall() {
    setError('')
    try {
      const res  = await fetch('/api/consultation/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appointmentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to join')
      setVideoToken(data.token)
      setRoomName(data.roomName)
      setPhase('call')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to call')
    }
  }

  if (phase === 'loading') {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-3">Loading consultation...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold">Your Consultation</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

      {phase === 'payment' && appointment && (
        <PaymentFlow
          appointmentId={appointmentId}
          doctorName={appointment.doctor.specialization}
          fee={Number(appointment.doctor.consultationFee)}
          onPaymentComplete={() => setPhase('waiting')}
        />
      )}

      {phase === 'waiting' && (
        <div className="space-y-4 text-center p-6 border rounded-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✅</span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Payment confirmed — funds held in escrow</p>
            <p className="text-sm text-gray-500 mt-1">Funds release to doctor only after prescription is uploaded</p>
          </div>
          <button
            onClick={joinCall}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-colors"
          >
            Join Video Call
          </button>
        </div>
      )}

      {phase === 'call' && videoToken && (
        <div className="space-y-3">
          <VideoCall token={videoToken} roomName={roomName} onCallEnd={() => setPhase('done')} />
          <p className="text-xs text-gray-400 text-center">
            The call is recording for safety. Your prescription will appear in Medical History.
          </p>
        </div>
      )}

      {phase === 'done' && (
        <div className="text-center space-y-4 py-12">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold">Consultation Complete</h2>
          <p className="text-gray-500">Your prescription has been added to your medical vault.</p>
          <a href="/history" className="inline-block mt-2 text-blue-600 hover:underline font-medium">
            View Medical History →
          </a>
        </div>
      )}
    </div>
  )
}
