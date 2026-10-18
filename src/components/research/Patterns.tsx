import { Link } from 'react-router-dom'
import { useResearch } from '../../lib/useResearch'
import { useGameStore } from '../../store/useGameStore'
import { entriesInRange, tagCounts } from '../../lib/research'
import { sleepForDate } from '../../lib/dailyTime'
import { addDays, todayKey } from '../../utils/date'

export function Patterns() {
  const { state } = useResearch()
  const game = useGameStore()
  const entries = entriesInRange(state!.entries, 30)
  const tags = tagCounts(entries)
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = addDays(todayKey(), index - 29)
    const legacy = [...entries].filter((entry) => entry.date === date).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const metadata = legacy.find((entry) => typeof entry.metadata?.sleepHours === 'number' && typeof entry.metadata?.completedTasks === 'number')?.metadata
    const sleep = sleepForDate(game, date).minutes
    const log = game.logs.find((log) => log.date === date)
    return { date, sleep: sleep !== null ? sleep / 60 : typeof metadata?.sleepHours === 'number' && metadata.sleepHours >= 0 && metadata.sleepHours <= 24 ? metadata.sleepHours : null, tasks: typeof log?.tasksCompleted === 'number' ? log.tasksCompleted : typeof metadata?.completedTasks === 'number' && metadata.completedTasks >= 0 ? metadata.completedTasks : null }
  }).filter((day) => day.sleep !== null && day.tasks !== null)
  const low = days.filter((day) => day.sleep! < 6), rested = days.filter((day) => day.sleep! >= 6)
  const average = (rows: typeof days) => rows.length ? (rows.reduce((sum, day) => sum + day.tasks!, 0) / rows.length).toFixed(1) : '—'
  return <div className="space-y-4"><p className="text-sm text-muted">从最近 30 天的记录找线索。这里展示已填的数据，留空的日子不会被当作 0。</p>
    <div className="grid grid-cols-3 gap-3">{[['随手记', entries.length], ['每日总结', game.logs.filter((log) => log.date >= addDays(todayKey(), -29) && log.date <= todayKey()).length], ['常见标签', tags[0] ? `#${tags[0][0]}` : '未记']].map(([label, value]) => <div key={label} className="card p-3 sm:p-5 min-w-0"><div className="text-xs text-muted">{label}</div><strong className="block text-lg sm:text-2xl mt-2 break-words">{value}</strong></div>)}</div>
    <section className="card-pad space-y-3"><h2 className="text-base font-semibold">最近常写到什么？</h2>{tags.length ? <div className="flex flex-wrap gap-2">{tags.slice(0, 12).map(([tag, count]) => <Link key={tag} className="chip hover:text-accent" to="/timeline?type=notes">#{tag} · {count} 次</Link>)}</div> : <p className="text-sm text-muted">随手记里加一些标签，积累后再回来看看。</p>}<p className="text-xs text-muted">出现得多只代表你常记录这件事，不代表它一定是原因。</p></section>
    <section className="card-pad space-y-4"><h2 className="text-base font-semibold">睡眠与完成情况</h2><p className="text-sm text-muted">按日期对齐生活记录和每日总结；旧档案中明确填写的状态也会保留参考。每个日期只计一次，共 {days.length} 天同时有这两项数据。</p><div className="grid grid-cols-2 gap-3">{[['睡眠低于 6 小时', low], ['睡眠至少 6 小时', rested]].map(([label, values]) => { const rows = values as typeof days; return <div key={String(label)} className="rounded-xl bg-ink-800 p-4"><p className="text-xs text-muted">{String(label)} · {rows.length} 天</p><p className="text-sm mt-2">平均完成 <strong className="text-xl text-accent-dim">{average(rows)}</strong> 项</p></div> })}</div><p className="text-xs text-muted leading-relaxed">这里只展示共同出现的情况。任务大小、环境和生活安排都可能影响结果，不会自动得出「睡得少导致完成少」的结论。</p></section>
    <Link to="/reflection?view=hypotheses" className="text-sm text-accent underline underline-offset-4 inline-flex">发现一个值得验证的想法？记下来 →</Link>
  </div>
}
