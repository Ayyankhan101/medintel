'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n/client'

const RECORD_TYPE_KEYS: Record<string, string> = {
  PRESCRIPTION: 'upload.typePrescription',
  LAB_REPORT:   'upload.typeLabReport',
  SURGERY:      'upload.typeSurgery',
  ALLERGY:      'upload.typeAllergy',
  CHRONIC_MED:  'upload.typeChronicMed',
}

interface Props { onUploaded: () => void }

export function RecordUploader({ onUploaded }: Props) {
  const { T } = useI18n()
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
    setStatus(T('upload.uploading'))

    try {
      const form = new FormData()
      form.append('file',  file)
      form.append('type',  type)
      form.append('title', title)

      const res = await fetch('/api/records/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? `Upload failed (HTTP ${res.status})`)
      }

      setSaved(true)
      setStatus('')
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
      <h3 className="font-semibold text-gray-800">{T('upload.title')}</h3>

      <div>
        <Label>{T('upload.docType')}</Label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-white"
        >
          {Object.entries(RECORD_TYPE_KEYS).map(([value, key]) => (
            <option key={value} value={value}>{T(key)}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>{T('upload.titleLabel')}</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={T('upload.titlePlaceholder')}
          required
        />
      </div>

      <div>
        <Label>{T('upload.fileLabel')}</Label>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <p className="text-xs text-gray-400 mt-1">{T('upload.fileHint')}</p>
      </div>

      <Button type="submit" disabled={loading || !file || !title} className="w-full">
        {loading ? (status || T('upload.uploading')) : T('upload.submit')}
      </Button>

      {saved && (
        <p className="text-green-600 text-sm text-center font-medium">
          {T('upload.saved')}
        </p>
      )}
      {!loading && !saved && status && (
        <p className="text-red-500 text-sm text-center">{status}</p>
      )}
    </form>
  )
}
