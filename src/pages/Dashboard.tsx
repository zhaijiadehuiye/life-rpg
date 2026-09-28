import { useMemo, useState } from 'react'
import { Check, Plus, Flame, Zap, CalendarCheck, Target, Save, TrendingUp } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { computePerformance } from '../utils/performance'
import { levelFromTotalXp } from '../utils/xp'
import { todayKey, dateKeyFromTimestamp, formatChineseDate } from '../utils/date'
import { XpBar, Meter } from '../components/XpBar'
import { Icon } from '../components/Icon'
import { AddQuestModal } from '../components/AddQuestModal'
import { calculateDailySettlement, CAPITAL_LABELS } from '../data/dailyRules'
import type { Capital, CapitalKey, DailyCheckIn } from '../types'

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
  const todayTx = s.transactions.filter((t) => dateKeyFromTimestamp(t.timestamp) === today)
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
          <div className="text-[12px] text-muted">{formatChineseDate(today)}</div>
          <h1 className="text-3xl font-bold text-zinc-900 mt-0.5 tracking-tight">{s.profile?.name}</h1>
          <div className="flex items-center gap-2 mt-2.5 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 font-semibold text-accent-dim">
              Lv.{s.profile?.level ?? 1}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-peach px-2.5 py-1 text-warn">
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
          <span className="font-medium">总 XP {s.profile?.totalXp ?? 0}</span>
          <span className="font-mono">
            {lv.xpIntoLevel} / {lv.xpToNext}
          </span>
        </div>
        <XpBar value={lv.xpIntoLevel} max={lv.xpToNext} />
        <div className="mt-2 text-[11px] text-muted">
          等级永不下降。今天获得 {todayXp} XP。
        </div>
      </div>

      <CheckInCard />

      <section className="card-pad rise" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="label">今日状态 · 游戏化参考值，非医学测量</h2>
          <div className="text-right">
            <div className="text-[10px] text-muted">当前发挥率</div>
            <div className={`font-bold text-3xl leading-none ${perf.performance >= 60 ? 'text-accent-dim' : perf.performance >= 40 ? 'text-warn' : 'text-danger'}`}>
              {perf.performance}<span className="text-sm font-medium">%</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          {MENTAL_LABEL.map((f) => (
            <div key={f.key}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-zinc-600">{f.label}</span>
                <span className="font-mono text-zinc-800">{s.mental[f.key]}</span>
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
        <p className="text-xs text-muted mt-4 flex gap-1.5">
          <Zap size={13} className="mt-0.5 shrink-0 text-accent" />
          {perf.suggestion}
        </p>
      </section>

      <section className="rise" style={{ animationDelay: '180ms' }}>
        <h2 className="label mb-2.5">当前 Buff / Debuff</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {s.effects.length === 0 && (
            <div className="col-span-full text-sm text-muted card-pad text-center">
              暂无状态。调整上方心理状态会自动生成。
            </div>
          )}
          {s.effects.map((e) => (
            <div
              key={e.id}
              className={`card p-3.5 flex items-start gap-2.5 ${
                e.type === 'buff' ? 'bg-mint/60' : 'bg-peach/60'
              }`}
            >
              <div className={`mt-0.5 ${e.type === 'buff' ? 'text-accent-dim' : 'text-danger'}`}>
                <Icon name={e.icon} size={18} />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-800">{e.name}</div>
                <div className="text-[11px] text-muted mt-0.5">{e.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rise" style={{ animationDelay: '240ms' }}>
        <h2 className="label mb-2.5">今日任务 · 完成它们来获得成长</h2>
        <div className="space-y-2">
          {todayTasks.length === 0 && (
            <div className="card-pad text-sm text-muted text-center">
              今天没有待办任务。点击右上角"新任务"加一个。
            </div>
          )}
          {todayTasks.map(({ kind, q }) => {
            const isDaily = kind === 'daily'
            const done = q.kind === 'daily' ? q.lastCompletedDate === today : q.completed
            return (
              <div key={q.id} className="card p-3.5 flex items-center gap-3">
                <button
                  onClick={() => (isDaily ? s.completeDailyQuest(q.id) : s.completeSideQuest(q.id))}
                  disabled={done}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    done ? 'bg-accent border-accent text-white' : 'border-line hover:border-accent text-transparent'
                  }`}
                >
                  <Check size={14} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${done ? 'line-through text-muted' : 'text-zinc-800'}`}>{q.title}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {isDaily ? '日常' : '支线'} · +{q.xpReward} XP
                    {'capitalKey' in q && q.capitalKey ? ` · ${capitalLabel(q.capitalKey, s.capitals)}` : ''}
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

      <DailyActionsCard />

      <section className="rise" style={{ animationDelay: '300ms' }}>
        <h2 className="label mb-2.5">当前主线</h2>
        <div className="space-y-2.5">
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
                  <div className="text-sm font-medium text-zinc-800">{m.title}</div>
                  <div className="text-[11px] font-mono text-muted">
                    {done}/{total}
                  </div>
                </div>
                <div className="mt-2.5">
                  <Meter value={pct} tone="gold" />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <DailySettlementCard fallbackTasks={todayLog?.tasksCompleted ?? todayCompleted} fallbackXp={todayXp} fallbackCapitalXp={todayCapitalXp} fallbackSkillXp={todaySkillXp} />

      <AddQuestModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}

function CheckInCard() {
  const s = useGameStore()
  const date = todayKey()
  const existing = s.checkIns?.[date]
  const [draft, setDraft] = useState<DailyCheckIn>(() => existing ?? { date, sleep: 7, energy: s.mental.energy, focus: s.mental.focus, mood: s.mental.mood, stress: s.mental.stress, selfEfficacy: s.mental.selfEfficacy, note: '', createdAt: new Date().toISOString() })
  const fields: { key: keyof Pick<DailyCheckIn, 'sleep' | 'energy' | 'focus' | 'mood' | 'stress' | 'selfEfficacy'>; label: string; max: number; suffix?: string }[] = [
    { key: 'sleep', label: '睡眠', max: 12, suffix: 'h' }, { key: 'energy', label: '精力', max: 100 }, { key: 'focus', label: '专注', max: 100 }, { key: 'mood', label: '情绪', max: 100 }, { key: 'stress', label: '压力', max: 100 }, { key: 'selfEfficacy', label: '自我效能', max: 100 },
  ]
  return <section className="card-pad rise" style={{ animationDelay: '90ms' }}><div className="flex items-start justify-between gap-3"><div><h2 className="label flex items-center gap-2"><CalendarCheck size={14} /> 每日 Check-in</h2><p className="text-xs text-muted mt-1">先看见自己，再决定今天怎么走。</p></div><span className="chip">{existing ? '已记录' : '待记录'}</span></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4 mt-5">{fields.map((field) => <label key={field.key}><div className="flex justify-between text-xs mb-1.5"><span className="text-zinc-600">{field.label}</span><span className="font-mono text-zinc-800">{draft[field.key]}{field.suffix ?? ''}</span></div><input aria-label={field.label} type="range" min={0} max={field.max} step={field.key === 'sleep' ? 0.5 : 1} value={draft[field.key]} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: Number(event.target.value) }))} className="w-full" /></label>)}</div><div className="flex gap-2 mt-5"><input aria-label="Check-in 备注" className="input" placeholder="此刻最值得被记住的一句话…" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} /><button className="btn-primary shrink-0" onClick={() => s.saveCheckIn({ ...draft, date })}><Save size={14} /> 保存</button></div></section>
}

function DailyActionsCard() {
  const s = useGameStore()
  const actions = (s.dailyActions ?? []).filter((action) => action.date === todayKey())
  return <section className="card-pad rise" style={{ animationDelay: '210ms' }}><div className="flex items-start justify-between"><div><h2 className="label flex items-center gap-2"><Target size={14} /> 今日 3 个关键行动</h2><p className="text-xs text-muted mt-1">规则引擎根据你今天的状态生成。</p></div><span className="font-mono text-xs text-muted">{actions.filter((action) => action.status === 'completed').length}/{actions.length || 3}</span></div>{actions.length === 0 ? <div className="mt-4 rounded-xl bg-peach/50 p-4 text-sm text-zinc-700">完成上方 Check-in 后，这里会出现今天最值得做的三件事。</div> : <div className="space-y-2 mt-4">{actions.map((action, index) => <div key={action.id} className={`card p-3.5 flex items-center gap-3 ${action.status === 'completed' ? 'bg-mint/40' : ''}`}><button aria-label={`完成 ${action.title}`} disabled={action.status === 'completed'} onClick={() => s.completeDailyAction(action.id)} className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${action.status === 'completed' ? 'bg-accent border-accent text-white' : 'border-line text-transparent hover:border-accent'}`}><Check size={14} /></button><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-[10px] font-mono text-muted">0{index + 1}</span><span className="chip">{action.capitalKey ? CAPITAL_LABELS[action.capitalKey] : '行动'}</span><span className="text-[11px] text-warn">+{action.xpReward} XP</span></div><div className={`text-sm mt-1 ${action.status === 'completed' ? 'line-through text-muted' : 'text-zinc-800'}`}>{action.title}</div><div className="text-[11px] text-muted mt-0.5 truncate">{action.description}</div></div></div>)}</div>}</section>
}

function DailySettlementCard({ fallbackTasks, fallbackXp, fallbackCapitalXp, fallbackSkillXp }: { fallbackTasks: number; fallbackXp: number; fallbackCapitalXp: number; fallbackSkillXp: number }) {
  const s = useGameStore()
  const summary = calculateDailySettlement(s)
  const settled = s.settlements?.some((item) => item.date === todayKey())
  return <section className="card-pad rise" style={{ animationDelay: '360ms' }}><div className="flex items-start justify-between"><div><h2 className="label flex items-center gap-2"><TrendingUp size={14} /> 今日结算</h2><p className="text-xs text-muted mt-1">把今天的行动转成明天可以继续的线索。</p></div><div className="text-right"><div className="text-2xl font-bold text-zinc-900">{summary.completionRate || Math.round((fallbackTasks / Math.max(1, s.dailyQuests.length + s.sideQuests.length)) * 100)}%</div><div className="text-[11px] text-muted">完成率</div></div></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-center"><Stat label="完成任务" value={fallbackTasks + (s.dailyActions ?? []).filter((a) => a.date === todayKey() && a.status === 'completed').length} /><Stat label="获得 XP" value={summary.xpEarned || fallbackXp} /><Stat label="资本 XP" value={summary.capitalXp || fallbackCapitalXp} /><Stat label="技能 XP" value={summary.skillXp || fallbackSkillXp} /></div><button className={`w-full mt-5 rounded-full px-4 py-2.5 text-sm font-medium ${settled ? 'bg-mint text-accent-dim' : 'btn-primary'}`} onClick={s.settleToday}>{settled ? '已结算 · 更新结算' : '完成今日结算'}</button></section>
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </div>
  )
}

function capitalLabel(key: CapitalKey, capitals: Capital[]): string {
  const cap = capitals.find((c) => c.key === key)
  return cap?.name ?? key
}
