'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CheckCircle2 } from 'lucide-react'

interface Props {
  appointmentId: string
  onUploaded: () => void
}

export function PrescriptionUploader({ appointmentId, onUploaded }: Props) {
  const [text, setText]       = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus]   = useState('')
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError('')

    try {
      let s3Key = ''

      if (file) {
        setStatus('Uploading file...')
        const contentType = file.type || 'application/pdf'
        const presignRes  = await fetch('/api/voice/presign', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ filename: file.name, contentType }),
        })
        const { uploadUrl, s3Key: key } = await presignRes.json()
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })
        s3Key = key
      }

      setStatus('Saving prescription and releasing payment...')
      const res = await fetch('/api/prescriptions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appointmentId, prescriptionS3Key: s3Key || 'text-only', prescriptionText: text }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed')
      }

      setStatus('done')
      onUploaded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
        <CheckCircle2 className="w-6 h-6 shrink-0" />
        <div>
          <p className="font-semibold">Prescription uploaded</p>
          <p className="text-sm">Payment has been released to your account.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-xl bg-green-50">
      <div>
        <h3 className="font-semibold text-green-900">Upload Prescription</h3>
        <p className="text-sm text-green-700 mt-0.5">
          Payment releases to your account automatically once you submit.
        </p>
      </div>

      <div>
        <Label>Prescription Text <span className="text-red-500">*</span></Label>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Rx: Aspirin 75mg once daily for 30 days&#10;Advice: Rest, avoid fatty foods&#10;Follow-up: 2 weeks"
          className="min-h-[140px] bg-white"
          required
        />
      </div>

      <div>
        <Label>Attach File (optional)</Label>
        <Input
          type="file"
          accept="image/*,application/pdf"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="bg-white"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button
        type="submit"
        disabled={loading || !text.trim()}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {loading ? status : 'Upload Prescription & Collect Payment'}
      </Button>
    </form>
  )
}
