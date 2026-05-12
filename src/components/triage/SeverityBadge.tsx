interface Props {
  score: number
  level: 'ROUTINE' | 'URGENT' | 'CRITICAL'
}

const config = {
  ROUTINE:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Routine' },
  URGENT:   { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Urgent' },
  CRITICAL: { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Critical' },
}

export function SeverityBadge({ score, level }: Props) {
  const { bg, text, label } = config[level]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {label} ({score}/10)
    </span>
  )
}
