import { Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmergencyAlert } from '@/components/emergency/EmergencyAlert'

interface KeyFinding {
  metric:         string
  value:          string
  interpretation: string
  isAbnormal:     boolean
}
interface Props {
  department: string
  severityScore: number
  severityLevel: 'ROUTINE' | 'URGENT' | 'CRITICAL'
  summary: string
  transcript: string
  isEmergency: boolean
  keyFindings?:            KeyFinding[]
  suggestedInterventions?: string[]
}

const severityColor: Record<string, string> = {
  ROUTINE:  'bg-green-100 text-green-800',
  URGENT:   'bg-yellow-100 text-yellow-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export function SymptomSummary({ department, severityScore, severityLevel, summary, transcript, isEmergency, keyFindings = [], suggestedInterventions = [] }: Props) {
  return (
    <div className="space-y-4">
      {isEmergency && <EmergencyAlert department={department} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>AI Medical Summary</span>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{department}</Badge>
              <Badge className={severityColor[severityLevel]}>
                Severity {severityScore}/10 — {severityLevel}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 leading-relaxed">{summary}</p>
        </CardContent>
      </Card>

      {keyFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span>📑</span> Clinical findings extracted from your documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {keyFindings.map((f, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">{f.metric}</td>
                    <td className={`py-2 pr-3 font-mono ${f.isAbnormal ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{f.value}</td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">{f.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {suggestedInterventions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span>👨‍⚕️</span> Suggested next steps (discuss with your doctor)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200 list-disc list-inside">
              {suggestedInterventions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-50 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-sm text-slate-500 dark:text-slate-400">Your Words (Transcript)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 dark:text-slate-300 text-sm italic">&ldquo;{transcript}&rdquo;</p>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-xl px-4 py-3 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>AI suggestion — not a medical diagnosis.</strong> This summary is generated automatically
          to help you describe your situation to a doctor. A licensed clinician will review your case and
          make all clinical decisions.
        </p>
      </div>
    </div>
  )
}
