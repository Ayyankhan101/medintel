'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const RECORD_TYPES = [
  { value: 'PRESCRIPTION', label: 'Prescription' },
  { value: 'LAB_REPORT',   label: 'Lab Report' },
  { value: 'SURGERY',      label: 'Surgery Record' },
  { value: 'ALLERGY',      label: 'Allergy' },
  { value: 'CHRONIC_MED',  label: 'Chronic Medication' },
]

const MIME_MAP: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg':  'image/jpeg',
  'image/png':  'image/png',
  'image/webp': 'image/webp',
  'application/pdf': 'application/pdf',
}

interface Props { onUploaded: () => void }

export function RecordUploader({ onUploaded }: Props) {
  const [type, setType]       = useState('PRESCRIPTION')
  const [title, setTitle]     = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus]   = useState('')
  const [saved, setSaved]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title) return
    setLoading(true)
    setSaved(false)
    setStatus('Uploading document...')

    try {
      const contentType = MIME_MAP[file.type] ?? 'image/jpeg'

      const presignRes = await fetch('/api/voice/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType }),
      })
      const { uploadUrl, s3Key } = await presignRes.json()

      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })

      setStatus('Running OCR scan...')

      const scanRes = await fetch('/api/records/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key, type, title, recordedAt: new Date().toISOString() }),
      })

      if (!scanRes.ok) {
        const err = await scanRes.json()
        throw new Error(err.error ?? 'Scan failed')
      }

      setSaved(true)
      setTitle('')
      setFile(null)
      onUploaded()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-xl bg-gray-50">
      <h3 className="font-semibold text-gray-800">Upload Medical Document</h3>

      <div>
        <Label>Document Type</Label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-white"
        >
          {RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <Label>Title / Description</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Blood Pressure Prescription 2024"
          required
        />
      </div>

      <div>
        <Label>Document Photo or PDF</Label>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP or PDF — max 10MB</p>
      </div>

      <Button type="submit" disabled={loading || !file || !title} className="w-full">
        {loading ? status : 'Upload & Scan'}
      </Button>

      {saved && (
        <p className="text-green-600 text-sm text-center font-medium">
          ✓ Document saved to your medical vault.
        </p>
      )}
      {!loading && !saved && status && (
        <p className="text-red-500 text-sm text-center">{status}</p>
      )}
    </form>
  )
}
