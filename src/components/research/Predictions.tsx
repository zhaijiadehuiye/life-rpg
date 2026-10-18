import { useState } from 'react'
import { Modal } from '../Modal'
import { useResearch } from '../../lib/useResearch'
import { EmptyResearch, ResearchField, ResearchForm } from '../ResearchUI'
import { fieldNumber, fieldText, researchDate, researchId } from '../../lib/research'
import { addDays, todayKey } from '../../utils/date'

export function Predictions() {
  const { state, commit } = useResearch()
  const [open, setOpen] = useState<string | null>(null)
  const resolved = state!.predictions.filter((row) => row.status === 'Resolved' && typeof row.result === 'boolean' && Number.isFinite(row.probability) && row.probability >= 0 && row.probability <= 1)
  const brier = resolved.length ? resolved.reduce((sum, row) => sum + (row.probability - (row.result ? 1 : 0)) ** 2, 0) / resolved.length : null
  const selected = state!.predictions.find((row) => row.id === open)
  return <div className="space-y-4"><div className="flex flex-wrap justify-between gap-3 items-center"><p className="text-sm text-muted max-w-xl">先写下对未来的猜测，再回头核对结果。用来了解自己的判断习惯，不是给自己打分。</p><button className="btn-primary" onClick={() => setOpen('new')}>记一个预测</button></div>
    {resolved.length > 0 && <section className="card-pad"><h2 className="label">回看自己的判断</h2><p className="text-sm mt-2">已核对 {resolved.length} 条 · 概率偏差参考 {brier?.toFixed(3)}</p><p className="text-xs text-muted mt-1">数值越接近 0，表示当时填写的概率与结果更接近；少量预测不能代表稳定的判断能力。</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">{[...new Set(resolved.map((row) => Math.round(row.probability * 10)))].sort((a, b) => a - b).map((bucket) => { const rows = resolved.filter((row) => Math.round(row.probability * 10) === bucket); return <div key={bucket} className="rounded-xl bg-ink-800 p-3 text-xs"><span className="text-muted">当时约 {bucket * 10}% · {rows.length} 条</span><p className="mt-1">实际发生 {Math.round(rows.filter((row) => row.result).length / rows.length * 100)}%</p></div> })}</div></section>}
    {!state!.predictions.length ? <EmptyResearch>例如：「我觉得下周有 70% 的可能完成两次散步。」到时候再回来核对。</EmptyResearch> : state!.predictions.map((row) => <article key={row.id} className="card-pad"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium whitespace-pre-wrap break-words">{row.text}</p><span className="text-xl font-semibold text-accent-dim shrink-0">{Math.round(row.probability * 100)}%</span></div><div className="flex flex-wrap justify-between gap-3 items-center mt-3 text-xs"><span className="text-muted">{researchDate(row.dueDate)} 前核对 · {row.status === 'Resolved' ? row.result ? '结果：发生了' : '结果：没有发生' : '等待核对'}</span>{row.status !== 'Resolved' && <button className="text-accent underline underline-offset-4 py-1" onClick={() => setOpen(row.id)}>记录结果</button>}</div></article>)}
    {open === 'new' && <Modal open title="记一个预测" onClose={() => setOpen(null)}><ResearchForm label="保存预测" onSuccess={() => setOpen(null)} onSave={async (data) => {
      const text = fieldText(data, 'text'), dueDate = fieldText(data, 'due'), probability = fieldNumber(data, 'probability', 0, 100) / 100
      if (!text || !dueDate || dueDate < todayKey()) throw new Error('请填写预测，并选择今天或之后的核对日期。')
      await commit((draft) => draft.predictions.unshift({ id: researchId('P'), text, probability, dueDate, status: 'Open', result: null, createdAt: new Date().toISOString() }))
    }}><ResearchField label="我预测会发生什么？"><textarea name="text" className="input" required rows={3} placeholder="写成到时候能核对是否发生的一件事。" /></ResearchField><ResearchField label="你觉得发生的可能性（0–100%）"><input name="probability" className="input" type="number" min={0} max={100} defaultValue={60} required /></ResearchField><ResearchField label="什么时候回来核对？"><input name="due" className="input" type="date" min={todayKey()} defaultValue={addDays(todayKey(), 7)} required /></ResearchField></ResearchForm></Modal>}
    {selected && <Modal open title="记录预测结果" onClose={() => setOpen(null)}><ResearchForm label="保存结果" onSuccess={() => setOpen(null)} onSave={async (data) => {
      await commit((draft) => { const row = draft.predictions.find((row) => row.id === selected.id); if (!row || row.status === 'Resolved') throw new Error('这条预测已核对，请重新打开。'); row.result = fieldText(data, 'result') === 'true'; row.status = 'Resolved'; row.resolvedAt = new Date().toISOString() })
    }}><p className="text-sm">{selected.text}</p><p className="text-xs text-muted">当时的预测概率 {Math.round(selected.probability * 100)}% 会保留。</p><ResearchField label="最终发生了吗？"><select className="input" name="result"><option value="true">发生了</option><option value="false">没有发生</option></select></ResearchField></ResearchForm></Modal>}
  </div>
}
