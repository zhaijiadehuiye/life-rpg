import { useState } from 'react'
import { useResearch } from '../../lib/useResearch'
import { useGameStore } from '../../store/useGameStore'
import { ResearchField, ResearchForm } from '../ResearchUI'
import { fieldText, researchDate, researchId, tagCounts } from '../../lib/research'
import { todayKey } from '../../utils/date'

export function Reviews() {
  const { state, commit } = useResearch()
  const logs = useGameStore((state) => state.logs)
  const [month, setMonth] = useState(todayKey().slice(0, 7))
  const [saved, setSaved] = useState(false)
  const notes = state!.entries.filter((entry) => entry.date.startsWith(month))
  const daily = logs.filter((log) => log.date.startsWith(month))
  const tags = tagCounts(notes).slice(0, 5)
  return <div className="space-y-4"><p className="text-sm text-muted">有空时回看一个月，留下自己的总结。不需要按时完成，也不会自动给你下结论。</p><section className="card-pad space-y-4">
    <ResearchField label="想回看哪个月？"><input aria-label="复盘月份" type="month" className="input max-w-xs" value={month} max={todayKey().slice(0, 7)} onChange={(event) => { if (event.target.value) { setMonth(event.target.value); setSaved(false) } }} /></ResearchField>
    <div className="rounded-xl bg-mint/40 p-4 text-sm"><p>这个月留下了 {daily.length} 份每日总结，{notes.length} 条随手记。</p><p className="text-xs text-muted mt-2">常见标签：{tags.map(([tag]) => `#${tag}`).join('、') || '还没有标签'}</p></div>
    <ResearchForm key={month} label="保存这次复盘" onSuccess={() => setSaved(true)} onSave={async (data) => {
      const note = fieldText(data, 'note'), nextVariable = fieldText(data, 'next')
      await commit((draft) => { const entries = draft.entries.filter((entry) => entry.date.startsWith(month)); draft.reviews.unshift({ id: researchId('review'), type: 'monthly', period: month, createdAt: new Date().toISOString(), note, data: { entryCount: entries.length, topTags: tagCounts(entries).slice(0, 5), evidenceCount: draft.evidence.filter((item) => item.createdAt.startsWith(month)).length, nextVariable } }) })
    }}><ResearchField label="这一段时间，有什么想记住的？（可选）"><textarea className="input" name="note" rows={4} placeholder="可以写变化、困难、值得高兴的事，或暂时没有答案的疑问。" /></ResearchField><ResearchField label="接下来想尝试的一件小事（可选）"><input className="input" name="next" placeholder="留空也没关系" /></ResearchField></ResearchForm>
    {saved && <p role="status" className="text-sm text-accent-dim">这次复盘已保存，之前的复盘也保留。</p>}
  </section><section className="space-y-3"><h2 className="label">过去的复盘</h2>{!state!.reviews.length && <p className="text-sm text-muted">还没有复盘记录，随时回来写即可。</p>}{state!.reviews.map((row) => <article key={row.id} className="card-pad space-y-2"><div className="flex justify-between gap-3 text-sm"><h3 className="font-semibold">{row.period}</h3><span className="text-xs text-muted">{researchDate(row.createdAt)}</span></div>{row.note && <p className="text-sm whitespace-pre-wrap break-words">{row.note}</p>}<p className="text-xs text-muted">当时有 {row.data?.entryCount ?? 0} 条随手记 · {(row.data?.topTags ?? []).map(([tag]) => `#${tag}`).join(' ')}</p>{row.data?.nextVariable && <p className="text-sm"><span className="text-muted">想尝试：</span>{row.data.nextVariable}</p>}</article>)}</section></div>
}
