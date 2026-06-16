'use client'
import { FileText, TestTube, Scissors, AlertTriangle, Pill, ClipboardList } from 'lucide-react'
import { useI18n } from '@/lib/i18n/client'

interface MedicalRecord {
  id: string; type: string; title: string; content: string; recordedAt: string; fileUrl?: string | null
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  PRESCRIPTION: 'timeline.prescription',
  LAB_REPORT:   'timeline.labReport',
  SURGERY:      'timeline.surgery',
  ALLERGY:      'timeline.allergy',
  CHRONIC_MED:  'timeline.chronicMed',
}
const DEFAULT_LABEL_KEY = 'timeline.note'

const TYPE_CONFIG: Record<string, { labelKey: string; icon: React.ElementType; bg: string; text: string; dot: string }> = {
  PRESCRIPTION: { labelKey: 'timeline.prescription', icon: FileText,      bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  LAB_REPORT:   { labelKey: 'timeline.labReport',   icon: TestTube,      bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  SURGERY:      { labelKey: 'timeline.surgery',      icon: Scissors,      bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400'    },
  ALLERGY:      { labelKey: 'timeline.allergy',      icon: AlertTriangle, bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  CHRONIC_MED:  { labelKey: 'timeline.chronicMed',  icon: Pill,          bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400'  },
}
const DEFAULT_CFG = { labelKey: 'timeline.note', icon: ClipboardList, bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' }

export function MedicalTimeline({ records }: { records: MedicalRecord[] }) {
  const { T } = useI18n()
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-8 h-8 text-slate-300" />
        </div>
        <p className="font-medium text-slate-500">{T('timeline.empty')}</p>
        <p className="text-sm mt-1">{T('timeline.emptySub')}</p>
      </div>
    )
  }

  return (
    <div className="relative space-y-3">
      <div className="absolute left-[1.1rem] top-3 bottom-3 w-px bg-slate-200" />
      {records.map(record => {
        const cfg   = TYPE_CONFIG[record.type] ?? DEFAULT_CFG
        const Icon  = cfg.icon
        return (
          <div key={record.id} className="relative pl-10">
            <div className={`absolute left-2 top-4 w-4 h-4 rounded-full border-2 border-white ${cfg.dot} shadow-sm`} />
            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                  </div>
                  <span className="font-medium text-slate-900">{record.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    {T(cfg.labelKey)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(record.recordedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-2 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                {record.content}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
