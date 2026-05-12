import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MedicalRecord {
  id: string
  type: string
  title: string
  content: string
  recordedAt: string
  fileUrl?: string | null
}

const typeConfig: Record<string, { color: string; label: string }> = {
  PRESCRIPTION: { color: 'bg-blue-100 text-blue-700',     label: 'Rx' },
  LAB_REPORT:   { color: 'bg-purple-100 text-purple-700', label: 'Lab' },
  SURGERY:      { color: 'bg-red-100 text-red-700',       label: 'Surgery' },
  ALLERGY:      { color: 'bg-orange-100 text-orange-700', label: 'Allergy' },
  CHRONIC_MED:  { color: 'bg-green-100 text-green-700',   label: 'Chronic' },
}

interface Props { records: MedicalRecord[] }

export function MedicalTimeline({ records }: Props) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-3">📋</div>
        <p>No medical records yet. Upload your first document.</p>
      </div>
    )
  }

  return (
    <div className="relative space-y-4">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      {records.map(record => {
        const cfg = typeConfig[record.type] ?? { color: 'bg-gray-100 text-gray-700', label: record.type }
        return (
          <div key={record.id} className="relative pl-10">
            <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{record.title}</span>
                  <div className="flex gap-2 items-center shrink-0">
                    <Badge className={cfg.color}>{cfg.label}</Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(record.recordedAt).toLocaleDateString('en-PK')}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{record.content}</p>
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
