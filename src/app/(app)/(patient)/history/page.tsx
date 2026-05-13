'use client'
import { useEffect, useState } from 'react'
import { MedicalTimeline } from '@/components/records/MedicalTimeline'
import { RecordUploader } from '@/components/records/RecordUploader'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

interface MedicalRecord {
  id: string
  type: string
  title: string
  content: string
  recordedAt: string
  fileUrl?: string | null
}

const TYPE_LABELS: Record<string, string> = {
  ALL:          'All',
  PRESCRIPTION: 'Prescriptions',
  LAB_REPORT:   'Lab Reports',
  SURGERY:      'Surgeries',
  ALLERGY:      'Allergies',
  CHRONIC_MED:  'Chronic Meds',
}

export default function HistoryPage() {
  const [records, setRecords]       = useState<MedicalRecord[]>([])
  const [loading, setLoading]       = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [filter, setFilter]         = useState('ALL')

  async function loadRecords() {
    setLoading(true)
    try {
      const res = await fetch('/api/records')
      if (res.ok) setRecords(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRecords() }, [])

  const filtered = filter === 'ALL' ? records : records.filter(r => r.type === filter)

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Medical History</h1>
          <p className="text-sm text-slate-500">{records.length} records in your vault</p>
        </div>
        <Button
          variant={showUpload ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add Record</>}
        </Button>
      </div>

      {showUpload && (
        <RecordUploader onUploaded={() => { loadRecords(); setShowUpload(false) }} />
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <MedicalTimeline records={filtered} />
      )}
    </div>
  )
}
