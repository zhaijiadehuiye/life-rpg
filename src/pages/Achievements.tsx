import { useGameStore } from '../store/useGameStore'
import { Icon } from '../components/Icon'

export default function Achievements() {
  const s = useGameStore()
  const unlocked = s.achievements.filter((a) => a.unlockedAt).length

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-zinc-800">成就</h1>
        <div className="text-sm text-muted font-mono">{unlocked} / {s.achievements.length}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {s.achievements.map((a) => {
          const got = !!a.unlockedAt
          const pct = Math.min(100, (a.progress / a.target) * 100)
          return (
            <div
              key={a.id}
              className={`card p-3 flex gap-3 ${got ? 'border-gold/40' : ''}`}
            >
              <div className={`mt-0.5 ${got ? 'text-gold' : 'text-muted'}`}>
                <Icon name={a.icon} size={22} />
              </div>
              <div className="flex-1">
                <div className="text-sm text-zinc-800">{a.name}</div>
                <div className="text-[11px] text-muted mt-0.5">{a.description}</div>
                <div className="mt-2">
                  <div className="h-1 rounded-full bg-ink-700 overflow-hidden">
                    <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-muted mt-1 font-mono">
                    {a.progress} / {a.target}
                    {got && a.unlockedAt ? ` · ${a.unlockedAt} 解锁` : ''}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
