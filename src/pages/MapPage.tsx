import { useGameStore } from '../store/useGameStore'

const STATUS_STYLE = {
  completed: 'border-accent/60 bg-accent/10 text-accent',
  available: 'border-gold/50 bg-gold/10 text-gold',
  locked: 'border-line bg-ink-800 text-muted',
} as const

export default function MapPage() {
  const s = useGameStore()
  const cycle = (id: string, current: 'locked' | 'available' | 'completed') => {
    const next = current === 'locked' ? 'available' : current === 'available' ? 'completed' : 'locked'
    s.setMapNodeStatus(id, next)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">人生地图</h1>
        <p className="text-sm text-muted mt-1">这是你给自己画的人生结构。点节点切换状态：锁定 → 可进入 → 已完成。</p>
      </div>
      <div className="relative card overflow-hidden" style={{ height: 480 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {s.mapNodes.map((n) =>
            s.mapNodes.map((m, i) => {
              if (m.y <= n.y) return null
              return <line key={`${n.id}-${i}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke="rgba(255,255,255,0.08)" strokeWidth={0.2} />
            }),
          )}
        </svg>
        {s.mapNodes.map((n) => (
          <button key={n.id} onClick={() => cycle(n.id, n.status)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-28 rounded-xl border p-2.5 text-left transition-transform hover:scale-105 ${STATUS_STYLE[n.status]}`}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}>
            <div className="text-xs font-medium">{n.title}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{n.subtitle}</div>
          </button>
        ))}
      </div>
      <div className="flex gap-3 text-[11px] text-muted">
        <span className="chip"><span className="w-2 h-2 rounded-full bg-accent inline-block" /> 已完成</span>
        <span className="chip"><span className="w-2 h-2 rounded-full bg-gold inline-block" /> 可进入</span>
        <span className="chip"><span className="w-2 h-2 rounded-full bg-muted inline-block" /> 未解锁</span>
      </div>
    </div>
  )
}
