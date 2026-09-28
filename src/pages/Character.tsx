import { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { computePerformance, effectiveValue } from '../utils/performance'
import { levelFromTotalXp, xpToNextLevel } from '../utils/xp'
import { XpBar, Meter } from '../components/XpBar'
import { Icon } from '../components/Icon'
import { formatChineseDate, diffDays } from '../utils/date'

export default function Character() {
  const s = useGameStore()
  const perf = useMemo(() => computePerformance(s.mental), [s.mental])
  const lv = levelFromTotalXp(s.profile?.totalXp ?? 0)
  const daysUsed = s.profile ? Math.max(1, diffDays(s.profile.createdAt, new Date().toISOString().slice(0, 10)) + 1) : 1
  const attrs = s.capitals

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-zinc-800">角色面板</h1>
      <div className="card-pad flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-ink-700 border border-accent/40 shadow-glow flex items-center justify-center text-accent font-mono text-xl">
          {s.profile?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1">
          <div className="text-lg text-zinc-800">{s.profile?.name}</div>
          <div className="text-xs text-muted mt-0.5">
            Lv.{s.profile?.level} · 加入 {daysUsed} 天 · 最长连续 {s.profile?.longestStreak} 天
          </div>
          <div className="mt-2 max-w-sm">
            <XpBar value={lv.xpIntoLevel} max={lv.xpToNext} />
            <div className="text-[11px] text-muted mt-1 font-mono">{lv.xpIntoLevel} / {lv.xpToNext} XP（累计 {s.profile?.totalXp}）</div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="label mb-2">核心资本 · 自我追踪工具，不是人的价值评分</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attrs.map((c) => {
            const effective = effectiveValue(c.level, perf.performance)
            return (
              <div key={c.key} className="card p-3">
                <div className="flex justify-between items-baseline">
                  <div className="text-sm text-zinc-800">{c.name}</div>
                  <div className="text-xs text-muted font-mono">基础 {c.level} · 当前有效 <span className="text-accent">{effective}</span></div>
                </div>
                <div className="mt-2"><Meter value={c.level} /></div>
                <div className="mt-2 text-[11px] text-muted">资本经验 {c.xp} / {c.xpToNext}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="label mb-2">当前状态</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {s.effects.map((e) => (
            <div key={e.id} className={`card p-3 flex gap-2.5 ${e.type === 'buff' ? 'border-accent/30' : 'border-danger/30'}`}>
              <div className={e.type === 'buff' ? 'text-accent' : 'text-danger'}><Icon name={e.icon} size={18} /></div>
              <div>
                <div className="text-sm text-zinc-800">{e.name}</div>
                <div className="text-[11px] text-muted">{e.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="label mb-2">最近成就</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {s.achievements.filter((a) => a.unlockedAt).slice(0, 6).map((a) => (
            <div key={a.id} className="card p-3 flex gap-2.5">
              <div className="text-gold"><Icon name={a.icon} size={18} /></div>
              <div>
                <div className="text-sm text-zinc-800">{a.name}</div>
                <div className="text-[11px] text-muted">{a.unlockedAt && formatChineseDate(a.unlockedAt)}</div>
              </div>
            </div>
          ))}
          {s.achievements.filter((a) => a.unlockedAt).length === 0 && (
            <div className="col-span-full text-sm text-muted card-pad text-center">还没有解锁成就。完成任务、写日志、保持连续来解锁。</div>
          )}
        </div>
      </section>

      <p className="text-[11px] text-muted/60">
        当前发挥率 = 游戏化参考值，用于自我观察，不代表心理学或医学诊断。下一级还需 {xpToNextLevel(s.profile?.level ?? 1)} XP。
      </p>
    </div>
  )
}
