'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CheckCircle2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/client'

interface Props {
  appointmentId: string
  onUploaded: () => void
}

export function PrescriptionUploader({ appointmentId, onUploaded }: Props) {
  const { T } = useI18n()
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
        setStatus(T('rx.uploadingFile'))
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

      setStatus(T('rx.savingPayment'))
      const res = await fetch('/api/prescriptions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appointmentId, prescriptionS3Key: s3Key || 'text-only', prescriptionText: text }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? T('rx.uploadFailed'))
      }

      setStatus('done')
      onUploaded()
    } catch (e) {
      setError(e instanceof Error ? e.message : T('rx.uploadFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
        <CheckCircle2 className="w-6 h-6 shrink-0" />
        <div>
          <p className="font-semibold">{T('rx.uploaded')}</p>
          <p className="text-sm">{T('rx.released')}</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-xl bg-green-50">
      <div>
        <h3 className="font-semibold text-green-900">{T('rx.title')}</h3>
        <p className="text-sm text-green-700 mt-0.5">
          {T('rx.hint')}
        </p>
      </div>

      <div>
        <Label>{T('rx.textLabel')} <span className="text-red-500">*</span></Label>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={T('rx.textPlaceholder')}
          className="min-h-[140px] bg-white"
          required
        />
      </div>

      <div>
        <Label>{T('rx.fileLabel')}</Label>
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
        {loading ? status : T('rx.submit')}
      </Button>
    </form>
  )
}
