'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, Shield, Stethoscope, ArrowRight, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmergencyAlert } from '@/components/emergency/EmergencyAlert'
import { useI18n } from '@/lib/i18n/client'

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

export function SymptomSummary({
  department, severityScore, severityLevel, summary, transcript, isEmergency,
  keyFindings = [], suggestedInterventions = [],
}: Props) {
  const [showTranscript, setShowTranscript] = useState(false)
  const { T } = useI18n()
  const severityConfig = {
    ROUTINE: {
      color: 'green',   label: T('summary.routine'),   bg: 'from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-950/30',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      icon: '💚', border: 'border-green-200 dark:border-green-800',
    },
    URGENT: {
      color: 'yellow',  label: T('summary.urgent'),    bg: 'from-yellow-50 to-amber-100 dark:from-yellow-950/40 dark:to-amber-950/30',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      icon: '⚠️', border: 'border-yellow-200 dark:border-yellow-800',
    },
    CRITICAL: {
      color: 'red',     label: T('summary.critical'),  bg: 'from-red-50 to-rose-100 dark:from-red-950/40 dark:to-rose-950/30',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      icon: '🚨', border: 'border-red-200 dark:border-red-800',
    },
  }
  const cfg = severityConfig[severityLevel]

  const summaryBullets = summary
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('-') || l.startsWith('*'))
    .map(l => l.replace(/^[-*]\s*/, ''))

  return (
    <div className="space-y-4">
      {isEmergency && <EmergencyAlert department={department} />}

      {/* ── Hero severity card ── */}
      <div className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-gradient-to-br ${cfg.bg} p-5`}
        style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{cfg.icon}</span>
              <Badge className={cfg.badge}>{severityLevel}</Badge>
              <Badge variant="outline" className="text-xs">{department}</Badge>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {severityScore}<span className="text-lg font-normal text-slate-500">{T('summary.scoreOfTen')}</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {T('summary.severitySentence').replace('{level}', cfg.label).replace('{department}', department)}
            </p>
          </div>
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/60 dark:bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <Shield className={`w-8 h-8 ${
              severityLevel === 'CRITICAL' ? 'text-red-500' :
              severityLevel === 'URGENT' ? 'text-amber-500' :
              'text-emerald-500'
            }`} />
          </div>
        </div>
      </div>

      {/* ── AI Medical Summary ── */}
      <Card style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span>{T('summary.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaryBullets.length > 1 ? (
            <ul className="space-y-2">
              {summaryBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-200 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
              {summaryBullets.length < summary.split('\n').filter(l => l.trim()).length && (
                <li className="text-slate-600 dark:text-slate-400 text-sm italic mt-2">
                  {summary.split('\n').filter(l => l.trim() && !l.startsWith('-') && !l.startsWith('*')).join(' ')}
                </li>
              )}
            </ul>
          ) : (
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{summary}</p>
          )}
        </CardContent>
      </Card>

      {/* ── Clinical findings table ── */}
      {keyFindings.length > 0 && (
        <Card style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span>📑</span> {T('summary.clinicalFindings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 pr-3 text-left font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">{T('summary.metric')}</th>
                    <th className="py-2 pr-3 text-left font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">{T('summary.value')}</th>
                    <th className="py-2 text-left font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">{T('summary.interpretation')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {keyFindings.map((f, i) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">{f.metric}</td>
                      <td className={`py-2.5 pr-3 font-mono ${f.isAbnormal ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{f.value}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">{f.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Suggested next steps ── */}
      {suggestedInterventions.length > 0 && (
        <Card style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span>👨‍⚕️</span> {T('summary.suggestedSteps')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
              {suggestedInterventions.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Expandable transcript ── */}
      <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
        <button onClick={() => setShowTranscript(v => !v)}
          className="w-full text-left">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {T('summary.yourWords')}
              </span>
              {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </button>
        {showTranscript && (
          <CardContent className="pt-0" style={{ animation: 'mi-fade-up 200ms var(--ease-out-quart) both' }}>
            <p className="text-slate-600 dark:text-slate-300 text-sm italic">&ldquo;{transcript}&rdquo;</p>
          </CardContent>
        )}
      </Card>

      {/* ── What happens next ── */}
      <Card style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <span>📋</span> {T('summary.whatNext')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {[
              { num: '1', title: T('summary.chooseDoctor'), desc: T('summary.chooseDoctorDesc') },
              { num: '2', title: T('summary.bookPay'), desc: T('summary.bookPayDesc') },
              { num: '3', title: T('summary.videoConsult'), desc: T('summary.videoConsultDesc') },
              { num: '4', title: T('summary.getRx'), desc: T('summary.getRxDesc') },
            ].map(step => (
              <div key={step.num} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {step.num}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{step.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Disclaimer ── */}
      <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          {T('summary.notDiagnosis')} {T('summary.clinicianReview')}
        </p>
      </div>
    </div>
  )
}
