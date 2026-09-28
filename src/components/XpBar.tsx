export function XpBar({
  value,
  max,
  height = 6,
  color = 'bg-accent',
}: {
  value: number
  max: number
  height?: number
  color?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className="w-full rounded-full bg-ink-700 overflow-hidden" style={{ height }}>
      <div
        className={`${color} h-full rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Meter({
  value,
  max = 100,
  tone = 'accent',
}: {
  value: number
  max?: number
  tone?: 'accent' | 'gold' | 'danger' | 'good'
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color =
    tone === 'gold' ? 'bg-gold' : tone === 'danger' ? 'bg-danger' : tone === 'good' ? 'bg-good' : 'bg-accent'
  return (
    <div className="w-full h-1.5 rounded-full bg-ink-700 overflow-hidden">
      <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  )
}
