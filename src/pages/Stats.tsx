import { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { lastNDays, dateKeyFromTimestamp, formatChineseDate } from '../utils/date'

export default function Stats() {
  const s = useGameStore()

  const last7 = lastNDays(7)
  const last30 = lastNDays(30)

  const tasksByDay = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of last7) {
      map[d] =
        s.dailyQuests.filter((q) => q.lastCompletedDate === d).length +
        s.sideQuests.filter((q) => q.completedAt === d).length
    }
    return map
  }, [s.dailyQuests, s.sideQuests, last7])

  const xp30 = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of last30) map[d] = 0
    for (const t of s.transactions) {
      const day = dateKeyFromTimestamp(t.timestamp)
      if (day in map && t.kind === 'character') map[day] += t.amount
    }
    return map
  }, [s.transactions, last30])

  const maxXp = Math.max(1, ...Object.values(xp30))
  const maxTasks = Math.max(1, ...Object.values(tasksByDay))

  const topSkills = [...s.skills].sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 5)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-800">统计</h1>

      <WeeklyReport />

      <section className="card-pad">
        <h2 className="label mb-3">最近 7 天完成任务数</h2>
        <div className="flex items-end gap-2 h-32">
          {last7.map((d) => (
            <div key={d} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[10px] font-mono text-muted">{tasksByDay[d]}</div>
              <div
                className="w-full rounded-t bg-accent/70"
                style={{ height: `${(tasksByDay[d] / maxTasks) * 100}%`, minHeight: 2 }}
              />
              <div className="text-[9px] text-muted">{d.slice(5)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card-pad">
        <h2 className="label mb-3">最近 30 天 XP</h2>
        <div className="flex items-end gap-0.5 h-24">
          {last30.map((d) => (
            <div
              key={d}
              className="flex-1 bg-gold/60 rounded-t"
              style={{ height: `${(xp30[d] / maxXp) * 100}%`, minHeight: 2 }}
              title={`${formatChineseDate(d)} · ${xp30[d]} XP`}
            />
          ))}
        </div>
      </section>

      <section className="card-pad">
        <h2 className="label mb-3">投入时间最多的技能</h2>
        <div className="space-y-2">
          {topSkills.length === 0 && <div className="text-sm text-muted">还没有技能数据。</div>}
          {topSkills.map((sk) => (
            <div key={sk.id} className="flex items-center gap-3">
              <div className="text-sm text-zinc-600 w-24">{sk.name}</div>
              <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${(sk.totalMinutes / Math.max(1, topSkills[0].totalMinutes)) * 100}%` }} />
              </div>
              <div className="text-xs font-mono text-muted w-16 text-right">{Math.round(sk.totalMinutes / 60)}h</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card-pad">
        <h2 className="label mb-3">六大资本当前值</h2>
        <div className="space-y-2">
          {s.capitals.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <div className="text-sm text-zinc-600 w-20">{c.name}</div>
              <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
                <div className="h-full bg-gold" style={{ width: `${c.level}%` }} />
              </div>
              <div className="text-xs font-mono text-muted w-8 text-right">{c.level}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card-pad">
        <h2 className="label mb-3">心理状态趋势（按日志日期）</h2>
        <div className="space-y-1.5 text-sm">
          {s.logs.slice(0, 7).map((l) => (
            <div key={l.date} className="flex justify-between text-xs">
              <span className="text-muted">{formatChineseDate(l.date)}</span>
              <span className="font-mono text-zinc-800">
                任务 {l.tasksCompleted} · XP {l.xpEarned}
              </span>
            </div>
          ))}
          {s.logs.length === 0 && <div className="text-muted text-sm">写日志后会出现趋势。</div>}
        </div>
      </section>
    </div>
  )
}

function WeeklyReport() {
  const s = useGameStore()
  const days = lastNDays(7)
  const xp = days.map((day) => s.transactions.filter((transaction) => dateKeyFromTimestamp(transaction.timestamp) === day && transaction.kind === 'character').reduce((sum, transaction) => sum + transaction.amount, 0))
  const sleepValues = days.map((day) => s.checkIns?.[day]?.sleep).filter((value): value is number => typeof value === 'number')
  const avgSleep = sleepValues.length ? (sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length).toFixed(1) : '—'
  const rates = days.map((day) => s.settlements?.find((item) => item.date === day)?.completionRate ?? 0)
  const avgRate = Math.round(rates.reduce((sum, value) => sum + value, 0) / rates.length)
  const mainlineSteps = s.mainQuests.reduce((sum, quest) => sum + quest.milestones.filter((milestone) => milestone.completedAt && days.includes(milestone.completedAt)).length, 0)
  const maxXp = Math.max(1, ...xp)
  return <section className="card-pad"><div className="flex items-start justify-between"><div><h2 className="label">最近 7 天 · 周报</h2><p className="text-xs text-muted mt-1">用趋势回看节奏，不用单日表现评判自己。</p></div><div className="text-right"><div className="text-2xl font-bold text-zinc-900">{xp.reduce((sum, value) => sum + value, 0)}</div><div className="text-[11px] text-muted">总 XP</div></div></div><div className="flex items-end gap-2 h-28 mt-5">{xp.map((value, index) => <div key={days[index]} className="flex-1 flex flex-col items-center gap-1"><div className="text-[10px] font-mono text-muted">{value}</div><div className="w-full rounded-t bg-accent/70" style={{ height: `${Math.max(4, (value / maxXp) * 100)}%` }} /><div className="text-[9px] text-muted">{days[index].slice(5)}</div></div>)}</div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-center"><SmallStat label="平均完成率" value={`${avgRate}%`} /><SmallStat label="平均睡眠" value={`${avgSleep} h`} /><SmallStat label="主线推进" value={`${mainlineSteps} 步`} /><SmallStat label="Check-in" value={`${sleepValues.length} 天`} /></div></section>
}

function SmallStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-ink-800 p-3"><div className="text-lg font-bold text-zinc-900">{value}</div><div className="text-[11px] text-muted mt-0.5">{label}</div></div> }
