import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { useResearch } from '../lib/useResearch'
import { EmptyResearch, ResearchBoundary, ResearchEntryDetail, ResearchHeader } from '../components/ResearchUI'
import { researchDate } from '../lib/research'

export default function Timeline() {
  const game = useGameStore()
  const { state } = useResearch()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)
  const type = params.get('type') ?? 'all'
  const rows = [
    ...game.logs.map((log) => ({ id: `daily:${log.date}`, date: log.date, kind: 'daily', text: [log.whatHappened, log.meals, log.biggestDifficulty, log.exerciseNote, log.bestThing, log.didRight, log.tomorrowPriority].filter(Boolean).join('\n'), log })),
    ...(state?.entries ?? []).map((entry) => ({ id: entry.id, date: entry.date, kind: 'notes', text: entry.currentText || entry.originalText, tags: entry.tags ?? [], entry })),
  ].filter((row) => (type === 'all' || row.kind === type) && (!from || row.date >= from) && (!to || row.date <= to) && `${row.text} ${'tags' in row ? row.tags.join(' ') : ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date))

  return <div className="space-y-5"><ResearchHeader title="历史记录" description="把每天的总结和随手记放在一起回看，看看当时发生了什么。原文与修订历史继续保留。" />
    <ResearchBoundary><section className="card-pad space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="历史记录类型">{[['all', '全部记录'], ['daily', '每日总结'], ['notes', '随手记']].map(([key, label]) => <button key={key} className={`research-tab ${type === key ? 'research-tab-active' : ''}`} aria-pressed={type === key} onClick={() => setParams(key === 'all' ? {} : { type: key })}>{label}</button>)}</div>
      <input className="input" aria-label="搜索历史记录" placeholder="搜索记录内容或标签" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="grid grid-cols-2 gap-3"><label className="text-xs text-muted">从<input aria-label="历史开始日期" type="date" className="input mt-1" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="text-xs text-muted">到<input aria-label="历史结束日期" type="date" className="input mt-1" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
      <p className="text-xs text-muted">共 {rows.length} 条。这里只合并展示，原来的两份存档仍保留。</p>
    </section>
    {!rows.length ? <EmptyResearch to="/journal?tab=notes">这段时间还没有匹配的记录。可以改一下筛选，或先记下一件事。</EmptyResearch> : <div className="space-y-3">{rows.slice(0, limit).map((row) => <article className="card-pad" key={row.id}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><span className="text-sm font-medium text-zinc-700">{researchDate(row.date)}</span><span className={`chip ${row.kind === 'daily' ? 'bg-mint/60' : 'bg-lav/60'}`}>{row.kind === 'daily' ? '每日总结' : '随手记'}</span></div>
      {'log' in row ? <div className="space-y-2 text-sm">{row.log.dayRating != null && <p className="text-accent-dim">自评分 {row.log.dayRating}/10</p>}{[['醒来', row.log.wakeTime], ['饮食', row.log.meals], ['做了什么', row.log.whatHappened], ['运动', row.log.exerciseNote || (row.log.exerciseDone === true ? '运动了' : row.log.exerciseDone === false ? '没有运动' : '')], ['不顺心的事', row.log.biggestDifficulty], ['值得记住', row.log.bestThing], ['做得不错', row.log.didRight], ['明天的重点', row.log.tomorrowPriority]].filter(([, value]) => value).map(([label, value]) => <p key={label} className="whitespace-pre-wrap break-words"><span className="text-muted">{label}：</span>{value}</p>)}</div> : <><p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{row.text}</p><div className="flex flex-wrap items-center justify-between gap-3 mt-4"><span className="text-xs text-muted">{row.tags.map((tag) => `#${tag}`).join(' ')} · {row.entry.revisions?.length || 1} 个版本</span><button className="text-xs text-accent underline underline-offset-4 py-1" onClick={() => setSelected(row.id)}>查看 / 补充</button></div></>}
    </article>)}</div>}
    {rows.length > limit && <button className="btn-ghost" onClick={() => setLimit((value) => value + 50)}>继续查看更早的记录（已显示 {limit} / {rows.length}）</button>}
    <Link to="/reflection" className="inline-flex text-sm text-accent underline underline-offset-4">想整理这些记录？去复盘与探索 →</Link>
    {selected && <ResearchEntryDetail key={selected} id={selected} onClose={() => setSelected(null)} />}
    </ResearchBoundary>
  </div>
}
