'use client'
import { useState } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface GroupedRecord { id: string; title: string; createdAt: string }
interface PatientHistory {
  recordCount: number
  grouped: {
    ALLERGY:      GroupedRecord[]
    CHRONIC_MED:  GroupedRecord[]
    SURGERY:      GroupedRecord[]
    LAB_REPORT:   GroupedRecord[]
    PRESCRIPTION: GroupedRecord[]
  }
}

const TYPE_LABELS: Record<string, string> = {
  ALLERGY:      'Allergies',
  CHRONIC_MED:  'Chronic Medications',
  SURGERY:      'Surgeries',
  LAB_REPORT:   'Lab Reports',
  PRESCRIPTION: 'Prescriptions',
}

const TYPE_COLORS: Record<string, string> = {
  ALLERGY:      'bg-red-100 text-red-800 border-red-200',
  CHRONIC_MED:  'bg-amber-100 text-amber-800 border-amber-200',
  SURGERY:      'bg-gray-100 text-gray-800 border-gray-200',
  LAB_REPORT:   'bg-blue-100 text-blue-800 border-blue-200',
  PRESCRIPTION: 'bg-green-100 text-green-800 border-green-200',
}

export default function PatientLookupPage() {
  const [code,    setCode]    = useState('')
  const [history, setHistory] = useState<PatientHistory | null>(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setError('')
    setHistory(null)
    setLoading(true)
    const res = await fetch(`/api/records/lookup?code=${encodeURIComponent(code.trim())}`)
    if (res.ok) {
      setHistory(await res.json())
    } else {
      const data = await res.json()
      setError(data.error ?? 'Patient not found')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patient History Lookup</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Enter a patient's MedIntel code to view their medical vault.
        </p>
      </div>

      <form onSubmit={lookup} className="flex gap-2">
        <Input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="MED-PK-1234"
          className="font-mono"
        />
        <Button type="submit" disabled={loading || !code.trim()}>
          <Search className="w-4 h-4 mr-1.5" />
          {loading ? 'Searching…' : 'Lookup'}
        </Button>
      </form>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {history && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Medical Vault</h2>
            <Badge variant="outline">{history.recordCount} records</Badge>
          </div>

          {Object.entries(history.grouped).map(([type, records]) =>
            records.length === 0 ? null : (
              <div key={type} className={`border rounded-xl p-4 space-y-2 ${TYPE_COLORS[type]}`}>
                <p className="font-semibold text-sm">{TYPE_LABELS[type] ?? type}</p>
                <ul className="space-y-1">
                  {records.map(r => (
                    <li key={r.id} className="text-sm flex items-center justify-between">
                      <span>{r.title}</span>
                      <span className="text-xs opacity-60">
                        {new Date(r.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
