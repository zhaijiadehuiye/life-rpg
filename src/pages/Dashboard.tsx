import { useMemo, useState } from 'react'
import { Check, Plus, Flame, Zap } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { computePerformance } from '../utils/performance'
import { levelFromTotalXp } from '../utils/xp'
import { todayKey, formatChineseDate } from '../utils/date'
import { XpBar, Meter } from '../components/XpBar'
import { Icon } from '../components/Icon'
import { AddQuestModal } from '../components/AddQuestModal'

const MENTAL_LABEL: { key: 'energy' | 'focus' | 'stress' | 'mood' | 'selfEfficacy' | 'socialBattery'; label: string; color: string }[] = [
  { key: 'energy', label: '精力', color: 'bg-accent' },
  { key: 'focus', label: '注意力', color: 'bg-accent' },
  { key: 'stress', label: '压力', color: 'bg-danger' },
  { key: 'mood', label: '情绪', color: 'bg-good' },
  { key: 'selfEfficacy', label: '自我效能', color: 'bg-gold' },
  { key: 'socialBattery', label: '社交电量', color: 'bg-gold' },
]

export default function Dashboard() {
  const s = useGameStore()
  const [showAdd, setShowAdd] = useState(false)

  const perf = useMemo(() => computePerformance(s.mental), [s.mental])
  const lv = levelFromTotalXp(s.profile?.totalXp ?? 0)
  const today = todayKey()

  const openSides = s.sideQuests.filter((q) => !q.completed).slice(0, 5)
  const openDailies = s.dailyQuests.filter((q) => q.lastCompletedDate !== today).slice(0, 5)
  const todayTasks = [...openDailies.map((q) => ({ kind: 'daily' as const, q })), ...openSides.map((q) => ({ kind: 'side' as const, q }))].slice(0, 5)

  const todayLog = s.logs.find((l) => l.date === today)
  const todayTx = s.transactions.filter((t) => t.timestamp.startsWith(today))
  const todayXp = todayTx.filter((t) => t.kind === 'character').reduce((sum, t) => sum + t.amount, 0)
  const todayCapitalXp = todayTx.filter((t) => t.kind === 'capital').reduce((sum, t) => sum + t.amount, 0)
  const todaySkillXp = todayTx.filter((t) => t.kind === 'skill').reduce((sum, t) => sum + t.amount, 0)
  const todayCompleted =
    s.dailyQuests.filter((d) => d.lastCompletedDate === today).length +
    s.sideQuests.filter((q) => q.completedAt === today).length

  const activeMains = s.mainQuests.filter((m) => m.status === 'active').slice(0, 3)

  return (
    <div className="space-y-5">
      <header className="rise flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] text-muted font-mono">{formatChineseDate(today)}</div>
          <h1 className="text-3xl font-display font-bold text-zinc-50 mt-0.5 tracking-wide">{s.profile?.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 font-display font-semibold text-accent shadow-badge animate-pulse-glow">
              Lv.{s.profile?.level ?? 1}
            </span>
            <span className="inline-flex items-center gap-1 text-warn">
              <Flame size={13} /> {s.profile?.streak ?? 0} 天连续
            </span>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 新任务
        </button>
      </header>

      <div className="card-pad rise" style={{ animationDelay: '60ms' }}>
        <div className="flex justify-between text-xs text-muted mb-2">
          <span className="font-display tracking-wider">总 XP {s.profile?.totalXp ?? 0}</span>
          <span className="font-mono">
            {lv.xpIntoLevel} / {lv.xpToNext}
          </span>
        </div>
        <XpBar value={lv.xpIntoLevel} max={lv.xpToNext} />
        <div className="mt-2 text-[11px] text-muted/70">
          等级永不下降。今天获得 {todayXp} XP。
        </div>
      </div>

      <section className="card-pad rise" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="label">今日状态 · 游戏化参考值，非医学测量</h2>
          <div className="text-right">
            <div className="text-[10px] text-muted">当前发挥率</div>
            <div className={`font-display font-bold text-2xl leading-none ${perf.performance >= 60 ? 'text-accent' : perf.performance >= 40 ? 'text-warn' : 'text-danger'}`}>
              {perf.performance}<span className="text-sm font-normal">%</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {MENTAL_LABEL.map((f) => (
            <div key={f.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">{f.label}</span>
                <span className="font-mono text-zinc-200">{s.mental[f.key]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={s.mental[f.key]}
                onChange={(e) => s.updateMental(f.key, Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3 flex gap-1.5">
          <Zap size={13} className="mt-0.5 shrink-0" />
          {perf.suggestion}
        </p>
      </section>

      <section className="rise" style={{ animationDelay: '180ms' }}>
        <h2 className="label mb-2">当前 Buff / Debuff</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {s.effects.length === 0 && (
            <div className="col-span-full text-sm text-muted card-pad text-center">
              暂无状态。调整上方心理状态会自动生成。
            </div>
          )}
          {s.effects.map((e) => (
            <div
              key={e.id}
              className={`card p-3 flex items-start gap-2.5 ${
                e.type === 'buff' ? 'border-accent/30' : 'border-danger/30'
              }`}
            >
              <div className={`mt-0.5 ${e.type === 'buff' ? 'text-accent' : 'text-danger'}`}>
                <Icon name={e.icon} size={18} />
              </div>
              <div>
                <div className="text-sm text-zinc-100">{e.name}</div>
                <div className="text-[11px] text-muted mt-0.5">{e.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rise" style={{ animationDelay: '240ms' }}>
        <h2 className="label mb-2">今日任务 · 完成它们来获得成长</h2>
        <div className="space-y-2">
          {todayTasks.length === 0 && (
            <div className="card-pad text-sm text-muted text-center">
              今天没有待办任务。点击右上角"新任务"加一个。
            </div>
          )}
          {todayTasks.map(({ kind, q }) => {
            const isDaily = kind === 'daily'
            const done = isDaily ? (q as any).lastCompletedDate === today : (q as any).completed
            return (
              <div key={q.id} className="card p-3 flex items-center gap-3">
                <button
                  onClick={() => (isDaily ? s.completeDailyQuest(q.id) : s.completeSideQuest(q.id))}
                  disabled={done}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    done ? 'bg-accent border-accent text-ink-950' : 'border-line hover:border-accent text-transparent'
                  }`}
                >
                  <Check size={14} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${done ? 'line-through text-muted' : 'text-zinc-100'}`}>{q.title}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {isDaily ? '日常' : '支线'} · +{q.xpReward} XP
                    {'capitalKey' in q && q.capitalKey ? ` · ${capitalLabel(q.capitalKey, s)}` : ''}
                  </div>
                </div>
                {!isDaily && !done && (
                  <button onClick={() => s.skipSideQuest(q.id)} className="text-muted hover:text-danger text-xs">
                    跳过
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="rise" style={{ animationDelay: '300ms' }}>
        <h2 className="label mb-2">当前主线</h2>
        <div className="space-y-2">
          {activeMains.length === 0 && (
            <div className="card-pad text-sm text-muted text-center">还没有主线。去任务页创建一条。</div>
          )}
          {activeMains.map((m) => {
            const done = m.milestones.filter((x) => x.completed).length
            const total = m.milestones.length
            const pct = total ? (done / total) * 100 : 0
            return (
              <div key={m.id} className="card-pad">
                <div className="flex justify-between items-baseline">
                  <div className="text-sm text-zinc-100">{m.title}</div>
                  <div className="text-[11px] font-mono text-muted">
                    {done}/{total}
                  </div>
                </div>
                <div className="mt-2">
                  <Meter value={pct} tone="gold" />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card-pad rise" style={{ animationDelay: '360ms' }}>
        <h2 className="label mb-3">今日结算</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <Stat label="完成任务" value={todayLog?.tasksCompleted ?? todayCompleted} />
          <Stat label="获得 XP" value={todayXp} />
          <Stat label="资本 XP" value={todayCapitalXp} />
          <Stat label="技能 XP" value={todaySkillXp} />
        </div>
      </section>

      <AddQuestModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-display font-bold text-zinc-50">{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </div>
  )
}

function capitalLabel(key: string, s: any): string {
  const cap = s.capitals.find((c: any) => c.key === key)
  return cap?.name ?? key
}
