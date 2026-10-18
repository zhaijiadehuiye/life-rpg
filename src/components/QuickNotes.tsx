import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useResearch } from '../lib/useResearch'
import { EmptyResearch, ResearchBoundary, ResearchEntryDetail, ResearchField, ResearchForm } from './ResearchUI'
import { fieldText, makeResearchEntry, researchDate } from '../lib/research'
import { todayKey } from '../utils/date'

export function QuickNotes() {
  const { state, commit } = useResearch()
  const [selected, setSelected] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [saved, setSaved] = useState(false)
  const entries = [...(state?.entries ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  return <ResearchBoundary><div className="space-y-5">
    <section className="card-pad space-y-4">
      <div><h2 className="text-base font-semibold text-zinc-800">此刻想记住什么？</h2><p className="text-sm text-muted mt-1.5 leading-relaxed">一件事、一段感受、一个想法都可以。同一天可以写多条；以后修改会保留旧版本。</p></div>
      <ResearchForm key={formKey} label="保存随手记" onSave={async (data) => {
        const tags = [...new Set(fieldText(data, 'tags').split(/[,，、#\s]+/).filter(Boolean))]
        const entry = makeResearchEntry(fieldText(data, 'text'), fieldText(data, 'date'), tags)
        await commit((draft) => { draft.entries.unshift(entry); draft.seeded = false })
      }} onSuccess={() => { setFormKey((key) => key + 1); setSaved(true) }}>
        <ResearchField label="记录内容"><textarea className="input" name="text" aria-label="随手记内容" rows={5} required placeholder="例如：今天散步时想通了一件事……先照自己的话写下来。" /></ResearchField>
        <div className="grid sm:grid-cols-2 gap-3"><ResearchField label="发生日期"><input className="input" name="date" aria-label="随手记日期" type="date" required defaultValue={todayKey()} max={todayKey()} /></ResearchField><ResearchField label="标签（可选）"><input className="input" name="tags" placeholder="例如：工作、家人、睡眠" /></ResearchField></div>
      </ResearchForm>
      {saved && <p role="status" className="text-sm text-accent-dim">已保存。下面可以查看，历史记录里也会显示。</p>}
    </section>
    <section><div className="flex items-center justify-between gap-3 mb-3"><h2 className="label">最近的随手记</h2><Link to="/timeline?type=notes" className="text-xs text-accent underline underline-offset-4">查看全部历史 →</Link></div>
      {!entries.length ? <EmptyResearch>还没有随手记，写几句话就能开始。不必每天写。</EmptyResearch> : <div className="space-y-3">{entries.slice(0, 8).map((entry) => <article key={entry.id} className="card-pad"><div className="flex justify-between gap-3 items-center text-xs mb-2"><span className="text-muted">{researchDate(entry.date)}</span><span className="text-muted">{entry.revisions?.length || 1} 个版本</span></div><p className="text-sm text-zinc-800 whitespace-pre-wrap break-words line-clamp-4 leading-relaxed">{entry.currentText || entry.originalText}</p><div className="flex flex-wrap justify-between gap-3 items-center mt-3"><span className="text-xs text-muted">{(entry.tags ?? []).map((tag) => `#${tag}`).join(' ')}</span><button className="text-xs text-accent underline underline-offset-4 py-1" onClick={() => setSelected(entry.id)}>查看 / 补充</button></div></article>)}</div>}
    </section>
    {selected && <ResearchEntryDetail key={selected} id={selected} onClose={() => setSelected(null)} />}
  </div></ResearchBoundary>
}
