import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { LifeOverview } from '../components/LifeOverview'
import { sleepForDate, formatDuration } from '../lib/dailyTime'
import { useNow } from '../utils/useNow'

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
  const now = useNow()
  const today = todayKey(now)

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
          <h1 className="text-3xl font-bold text-zinc-900 mt-0.5 tracking-tight">今天</h1>
          <div className="text-sm text-muted mt-1">{s.profile?.name} 的个人空间</div>
          <div className="flex flex-wrap items-center gap-2 mt-2.5 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 font-semibold text-accent-dim">
              Lv.{s.profile?.level ?? 1}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-peach px-2.5 py-1 text-warn">
              <Flame size={13} /> 连续记录 {s.profile?.streak ?? 0} 天
            </span>
          </div>
        </div>
        <button className="btn-primary shrink-0 whitespace-nowrap" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 添加计划
        </button>
      </header>

      <LifeOverview />

      <div className="card p-4 rise" style={{ animationDelay: '60ms' }}>
        <div className="flex justify-between text-xs text-muted mb-2">
          <span className="font-medium">成长经验 XP {s.profile?.totalXp ?? 0}</span>
          <span className="font-mono">
            {lv.xpIntoLevel} / {lv.xpToNext}
          </span>
        </div>
        <XpBar value={lv.xpIntoLevel} max={lv.xpToNext} />
        <div className="mt-2 text-[11px] text-muted">
          完成计划或行动后会获得经验。已有经验不会因休息或漏记而减少。今天获得 {todayXp} XP。
        </div>
      </div>

      <section className="rise" style={{ animationDelay: '90ms' }}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="label">今日任务</h2>
          <div className="flex items-center gap-3">
            <Link to="/journal" className="text-xs text-accent underline underline-offset-2">记今天</Link>
            <Link to="/quests" className="text-xs text-accent underline underline-offset-2">管理计划</Link>
          </div>
        </div>
        <p className="text-xs text-muted mb-2.5">你添加的固定习惯和一次性事项。长期目标在「计划」页查看。</p>
        <div className="space-y-2">
          {todayTasks.length === 0 && (
            <div className="card-pad text-sm text-muted text-center">
              今天没有待办。可以添加一项计划，也可以什么都不安排。
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
                  aria-label={`${done ? '已完成' : '完成'}：${q.title}`}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    done ? 'bg-accent border-accent text-white' : 'border-line hover:border-accent text-transparent'
                  }`}
                >
                  <Check size={14} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${done ? 'line-through text-muted' : 'text-zinc-800'}`}>{q.title}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {isDaily ? '固定习惯' : '一次性事项'} · 完成得 +{q.xpReward} XP
                    {'capitalKey' in q && q.capitalKey ? ` · ${capitalLabel(q.capitalKey, s.capitals)}` : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section aria-label="常用入口" className="grid gap-3 sm:grid-cols-3">
        <Link to="/journal?tab=notes" className="card-pad block hover:border-accent/40"><h2 className="font-semibold text-zinc-800">记一件事 →</h2><p className="mt-2 text-sm text-muted">随手记下经历和想法，补充时保留旧版本。</p></Link>
        <Link to="/timeline" className="card-pad block hover:border-accent/40"><h2 className="font-semibold text-zinc-800">回看过去 →</h2><p className="mt-2 text-sm text-muted">每日总结和随手记放在一起回看。</p></Link>
        <Link to="/reflection" className="card-pad block hover:border-accent/40"><h2 className="font-semibold text-zinc-800">整理想法 →</h2><p className="mt-2 text-sm text-muted">找生活线索，验证想法，尝试一个小改变。</p></Link>
      </section>

      <Link to="/guide" className="inline-flex items-center gap-2 text-sm text-accent underline underline-offset-2">
        第一次使用？打开中文使用说明 →
      </Link>

      <CheckInCard key={today} />

      <section className="card-pad rise" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="label">状态参考 · 不是评价或医学测量</h2>
          <div className="text-right">
            <div className="text-[10px] text-muted">状态参考值</div>
            <div className={`font-bold text-3xl leading-none ${perf.performance >= 60 ? 'text-accent-dim' : perf.performance >= 40 ? 'text-warn' : 'text-danger'}`}>
              {perf.performance}<span className="text-sm font-medium">%</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {MENTAL_LABEL.filter((field) => field.key !== 'socialBattery').map((field) => (
            <span key={field.key}>{field.label} {s.mental[field.key]}</span>
          ))}
          <label className="flex items-center gap-2">
            <span>社交精力 {s.mental.socialBattery}</span>
            <input aria-label="社交精力" type="range" min={0} max={100} value={s.mental.socialBattery}
              onChange={(event) => s.updateMental('socialBattery', Number(event.target.value))} className="w-24" />
          </label>
        </div>
        <p className="text-xs text-muted mt-3 flex gap-1.5">
          <Zap size={13} className="mt-0.5 shrink-0 text-accent" />
          {perf.suggestion} 这个参考值只影响成长面板的状态展示，不影响经验奖励。
        </p>
      </section>

      <section className="rise" style={{ animationDelay: '180ms' }}>
        <h2 className="label mb-1">状态提示（可忽略）</h2>
        <p className="text-xs text-muted mb-2.5">根据已记录的状态生成的提醒，不会限制你做什么，也不会扣经验。</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {s.effects.length === 0 && (
            <div className="col-span-full text-sm text-muted card-pad text-center">
              暂无提示。记录状态后会在这里显示。
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
  const sleep = sleepForDate(s, date)
  const [draft, setDraft] = useState<DailyCheckIn>(() => existing ?? { date, sleep: 7, energy: s.mental.energy, focus: s.mental.focus, mood: s.mental.mood, stress: s.mental.stress, selfEfficacy: s.mental.selfEfficacy, note: '', createdAt: new Date().toISOString() })
  const fields: { key: keyof Pick<DailyCheckIn, 'sleep' | 'energy' | 'focus' | 'mood' | 'stress' | 'selfEfficacy'>; label: string; max: number; suffix?: string }[] = [
    { key: 'sleep', label: '睡眠（自报）', max: 12, suffix: 'h' }, { key: 'energy', label: '精力', max: 100 }, { key: 'focus', label: '专注', max: 100 }, { key: 'mood', label: '情绪', max: 100 }, { key: 'stress', label: '压力', max: 100 }, { key: 'selfEfficacy', label: '自我效能', max: 100 },
  ]
  return <section className="card-pad rise" style={{ animationDelay: '90ms' }}><div className="flex items-start justify-between gap-3"><div><h2 className="label flex items-center gap-2"><CalendarCheck size={14} /> 记录今天的状态 <span className="text-xs text-muted font-normal">（可选）</span></h2><p className="text-xs text-muted mt-1">精力、专注等状态参考，不等于每日自评分。详细日常记录请到「每日记录」。</p></div><span className="chip">{existing ? '已记录' : '尚未记录'}</span></div><p className="text-xs text-muted mt-3">{sleep.source === 'interval' ? `睡眠 ${formatDuration(sleep.minutes)}，来自睡眠时段，无需重复填写。` : '睡眠为手动估计的时长；补记睡眠起止时间后会优先使用时段。'}</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4 mt-5">{fields.filter((field) => field.key !== 'sleep' || sleep.source !== 'interval').map((field) => <label key={field.key}><div className="flex justify-between text-xs mb-1.5"><span className="text-zinc-600">{field.label}</span><span className="font-mono text-zinc-800">{draft[field.key]}{field.suffix ?? ''}</span></div><input aria-label={field.label} type="range" min={0} max={field.max} step={field.key === 'sleep' ? 0.5 : 1} value={draft[field.key]} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: Number(event.target.value) }))} className="w-full" /></label>)}</div><div className="flex flex-col sm:flex-row gap-2 mt-5"><input aria-label="状态备注" className="input" placeholder="有什么想记下的？（可选）" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} /><button className="btn-primary shrink-0" onClick={() => s.saveCheckIn({ ...draft, date, sleep: sleep.source === 'interval' ? sleep.minutes! / 60 : draft.sleep })}><Save size={14} /> 保存状态</button></div><p className="text-[11px] text-muted mt-2">保存后会提供 3 条行动建议；不代表必须完成，也不会因为跳过而扣经验。</p></section>
}

function DailyActionsCard() {
  const s = useGameStore()
  const actions = (s.dailyActions ?? []).filter((action) => action.date === todayKey())
  return <section className="card-pad rise" style={{ animationDelay: '210ms' }}><div className="flex items-start justify-between gap-3"><div><h2 className="label flex items-center gap-2"><Target size={14} /> 今天的行动建议</h2><p className="text-xs text-muted mt-1">根据刚才记录的状态生成。可直接忽略，也可以只挑一项。</p></div><span className="font-mono text-xs text-muted">{actions.filter((action) => action.status === 'completed').length}/{actions.length || 3} 已完成</span></div>{actions.length === 0 ? <div className="mt-4 rounded-xl bg-peach/50 p-4 text-sm text-zinc-700">保存状态后会出现建议。不记录也没关系，你仍然可以从自己的计划开始。</div> : <div className="space-y-2 mt-4">{actions.map((action, index) => <div key={action.id} className={`card p-3.5 flex items-center gap-3 ${action.status === 'completed' ? 'bg-mint/40' : ''}`}><button aria-label={`${action.status === 'completed' ? '已完成' : '完成建议'}：${action.title}`} disabled={action.status === 'completed'} onClick={() => s.completeDailyAction(action.id)} className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${action.status === 'completed' ? 'bg-accent border-accent text-white' : 'border-line text-transparent hover:border-accent'}`}><Check size={14} /></button><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-[10px] font-mono text-muted">0{index + 1}</span><span className="chip">{action.capitalKey ? CAPITAL_LABELS[action.capitalKey] : '行动'}</span><span className="text-[11px] text-warn">完成得 +{action.xpReward} XP</span></div><div className={`text-sm mt-1 ${action.status === 'completed' ? 'line-through text-muted' : 'text-zinc-800'}`}>{action.title}</div><div className="text-[11px] text-muted mt-0.5 truncate">{action.description}</div></div></div>)}</div>}</section>
}

function DailySettlementCard({ fallbackTasks, fallbackXp, fallbackCapitalXp, fallbackSkillXp }: { fallbackTasks: number; fallbackXp: number; fallbackCapitalXp: number; fallbackSkillXp: number }) {
  const s = useGameStore()
  const summary = calculateDailySettlement(s)
  const settled = s.settlements?.some((item) => item.date === todayKey())
  return <section className="card-pad rise" style={{ animationDelay: '360ms' }}><div className="flex items-start justify-between"><div><h2 className="label flex items-center gap-2"><TrendingUp size={14} /> 今日小结</h2><p className="text-xs text-muted mt-1">可选。保存后用于趋势回顾，不会发放或扣除经验。</p></div><div className="text-right"><div className="text-2xl font-bold text-zinc-900">{summary.completionRate || Math.round((fallbackTasks / Math.max(1, s.dailyQuests.length + s.sideQuests.length)) * 100)}%</div><div className="text-[11px] text-muted">完成比例参考</div></div></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-center"><Stat label="完成的事项" value={fallbackTasks + (s.dailyActions ?? []).filter((a) => a.date === todayKey() && a.status === 'completed').length} /><Stat label="获得经验 XP" value={summary.xpEarned || fallbackXp} /><Stat label="资本经验" value={summary.capitalXp || fallbackCapitalXp} /><Stat label="技能经验" value={summary.skillXp || fallbackSkillXp} /></div><button className={`w-full mt-5 rounded-full px-4 py-2.5 text-sm font-medium ${settled ? 'bg-mint text-accent-dim' : 'btn-primary'}`} onClick={s.settleToday}>{settled ? '小结已保存 · 更新小结' : '保存今天的小结'}</button></section>
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
