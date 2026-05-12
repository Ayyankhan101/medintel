import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  department: string
  severityScore: number
  severityLevel: 'ROUTINE' | 'URGENT' | 'CRITICAL'
  summary: string
  transcript: string
  isEmergency: boolean
}

const severityColor: Record<string, string> = {
  ROUTINE:  'bg-green-100 text-green-800',
  URGENT:   'bg-yellow-100 text-yellow-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export function SymptomSummary({
  department,
  severityScore,
  severityLevel,
  summary,
  transcript,
  isEmergency,
}: Props) {
  return (
    <div className="space-y-4">
      {isEmergency && (
        <div className="bg-red-600 text-white px-4 py-3 rounded-lg text-center font-bold text-lg animate-pulse">
          EMERGENCY DETECTED — Scroll down for immediate guidance
        </div>
      )}

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
          <p className="text-gray-700 leading-relaxed">{summary}</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Your Words (Transcript)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm italic">&ldquo;{transcript}&rdquo;</p>
        </CardContent>
      </Card>
    </div>
  )
}
