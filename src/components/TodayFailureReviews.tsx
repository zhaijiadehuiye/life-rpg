import { Link } from 'react-router-dom'
import { ArrowRight, Plus, NotebookPen } from 'lucide-react'
import { useFailureReviews } from '../lib/useFailureReviews'
import { latestReview, reviewStatus } from '../lib/failureReviews'
import { todayKey } from '../utils/date'
import { useNow } from '../utils/useNow'

export function TodayFailureReviews() {
  const { reviews, error } = useFailureReviews()
  const today = todayKey(useNow())
  const rows = reviews.filter((row) => latestReview(row).date === today).reverse()
  return <section className="card-pad space-y-4" aria-label="今天的失败复盘">
    <div><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-zinc-800">今天想复盘的事</h2><span className="text-xs text-muted">{rows.length} 件</span></div><p className="text-sm text-muted mt-1">哪件事没按预期？写下来，找一个小调整。</p></div>
    {error ? <p role="alert" className="text-sm text-danger">{error}</p> : rows.length ? <div className="space-y-2">{rows.slice(0, 3).map((row) => {
      const current = latestReview(row)
      return <Link key={row.id} to={`/reflection?view=failures&date=${current.date}&review=${encodeURIComponent(row.id)}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:border-accent/40"><NotebookPen size={18} className="text-accent shrink-0" /><div className="flex-1 min-w-0"><h3 className="font-medium text-sm text-zinc-800 break-words line-clamp-2">{current.expected}</h3><p className="text-xs text-muted mt-1 break-words line-clamp-2">{current.nextStep ? `下次：${current.nextStep}` : current.actual}</p></div><span className="chip text-accent-dim shrink-0">{reviewStatus(row)}</span></Link>
    })}</div> : <p className="rounded-xl bg-ink-800 p-3 text-sm text-muted">还没有记录。遇到想调整的事再来写，不用每天填写。</p>}
    <div className="flex flex-wrap items-center gap-3"><Link className="btn-primary" to={`/reflection?view=failures&date=${today}&new=1&from=today`}><Plus size={15} /> 记一次复盘</Link><Link className="text-sm text-accent inline-flex items-center gap-1" to={`/reflection?view=failures&date=${today}&range=all`}>查看全部复盘 <ArrowRight size={14} /></Link></div>
    <p className="text-xs text-muted">只记录你想复盘的事，不影响经验值或任务完成状态。</p>
  </section>
}
