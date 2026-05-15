export function PKR(n: number | null | undefined): string {
  return 'PKR ' + (n ?? 0).toLocaleString('en-PK')
}

export type StatusTone = 'neutral' | 'blue' | 'violet' | 'amber' | 'red' | 'emerald'
