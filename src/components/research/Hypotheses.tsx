import { useState } from 'react'
import { Modal } from '../Modal'
import { useResearch } from '../../lib/useResearch'
import { EmptyResearch, ResearchField, ResearchForm } from '../ResearchUI'
import { fieldNumber, fieldText, researchDate, researchId, statusLabel } from '../../lib/research'
import { todayKey } from '../../utils/date'

export function Hypotheses() {
  const { state, commit } = useResearch()
  const [open, setOpen] = useState<string | null>(null)
  const rows = [...(state?.hypotheses ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return <div className="space-y-4">
    <div className="flex flex-wrap justify-between gap-3 items-center"><p className="text-sm text-muted max-w-xl">把不确定的解释先当成一个想法，找支持它和反对它的记录，再慢慢调整判断。</p><button className="btn-primary" onClick={() => setOpen('new')}>记一个想法</button></div>
    {!rows.length ? <EmptyResearch>例如：「我在任务足够小时更容易开始。」它是待验证的想法，不是对自己的定论。</EmptyResearch> : <div className="grid sm:grid-cols-2 gap-3">{rows.map((row) => <article key={row.id} className="card-pad space-y-3"><div className="flex items-start justify-between gap-3"><h2 className="text-base font-semibold">{row.title}</h2><span className="chip shrink-0">{statusLabel(row.status)}</span></div><p className="text-sm text-muted leading-relaxed whitespace-pre-wrap break-words">{row.description}</p><div><div className="flex justify-between text-xs mb-2"><span className="text-muted">目前有多相信这个想法</span><span className="text-accent-dim">{row.confidence}%</span></div><div className="h-1.5 rounded-full bg-ink-700 overflow-hidden"><div className="h-full bg-accent/60" style={{ width: `${Math.max(0, Math.min(100, row.confidence))}%` }} /></div></div><div className="flex justify-between text-xs gap-3"><span className="text-muted">支持 {row.supportingEvidence?.length ?? 0} · 反对 {row.opposingEvidence?.length ?? 0}</span><button className="text-accent underline underline-offset-4" onClick={() => setOpen(row.id)}>查看 / 添加证据</button></div></article>)}</div>}
    {open === 'new' && <Modal open title="记一个想法" onClose={() => setOpen(null)}><ResearchForm label="保存想法" onSuccess={() => setOpen(null)} onSave={async (data) => {
      const title = fieldText(data, 'title'), description = fieldText(data, 'description'), confidence = fieldNumber(data, 'confidence', 0, 100)
      if (!title || !description) throw new Error('请写下想法和你想验证的内容。')
      const timestamp = new Date().toISOString()
      await commit((draft) => draft.hypotheses.unshift({ id: researchId('H'), title, description, confidence, status: 'Active', createdAt: timestamp, updatedAt: timestamp, confidenceHistory: [{ date: todayKey(), confidence, reason: '首次提出' }], supportingEvidence: [], opposingEvidence: [] }))
    }}><ResearchField label="我想验证的想法"><input className="input" name="title" required placeholder="例如：任务拆小后，我更容易开始" /></ResearchField><ResearchField label="为什么这样想？"><textarea className="input" name="description" rows={3} required placeholder="描述观察到的事情，也可以写下不确定的地方。" /></ResearchField><ResearchField label="目前相信的程度（0–100%）" hint="只代表你的当前判断，随时可以调整。"><input className="input" name="confidence" type="number" min={0} max={100} defaultValue={40} required /></ResearchField></ResearchForm></Modal>}
    {open && open !== 'new' && <HypothesisDetail id={open} onClose={() => setOpen(null)} />}
  </div>
}

function HypothesisDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, commit } = useResearch()
  const row = state!.hypotheses.find((row) => row.id === id)
  const [message, setMessage] = useState('')
  if (!row) return null
  const evidence = state!.evidence.filter((item) => item.hypothesisId === id)
  return <Modal open title={row.title} onClose={onClose}><div className="space-y-5 text-sm">
    <p className="text-muted whitespace-pre-wrap leading-relaxed">{row.description}</p>
    <ResearchForm label="追加一次判断" onSuccess={() => setMessage('新的判断已追加，之前的历史仍保留。')} onSave={async (data) => {
      const confidence = fieldNumber(data, 'confidence', 0, 100), reason = fieldText(data, 'reason') || '没有补充理由', status = fieldText(data, 'status')
      await commit((draft) => { const item = draft.hypotheses.find((item) => item.id === id); if (!item) throw new Error('想法已不存在。'); item.confidence = confidence; item.status = status; item.updatedAt = new Date().toISOString(); item.confidenceHistory = [...(item.confidenceHistory ?? []), { date: todayKey(), confidence, reason }] })
    }}><div className="grid grid-cols-2 gap-3"><ResearchField label="目前相信程度（%）"><input aria-label="想法相信程度" className="input" type="number" name="confidence" required min={0} max={100} defaultValue={row.confidence} /></ResearchField><ResearchField label="状态"><select className="input" name="status" defaultValue={row.status}>{[...new Set(['Active', 'Weak', 'Supported', 'Rejected', 'Archived', row.status])].map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></ResearchField></div><ResearchField label="这次为什么调整？（可选）"><textarea className="input" name="reason" rows={2} /></ResearchField></ResearchForm>
    {message && <p role="status" className="text-xs text-accent-dim">{message}</p>}
    <details><summary className="text-accent cursor-pointer">查看判断变化 · {row.confidenceHistory?.length ?? 0} 次</summary><div className="space-y-2 mt-3">{(row.confidenceHistory ?? []).map((item, index) => <p className="border-l-2 border-line pl-3 text-xs" key={index}>{researchDate(item.date)} · {item.confidence}%<span className="block text-muted mt-1">{item.reason}</span></p>)}</div></details>
    <div className="border-t border-line pt-4"><h3 className="font-medium mb-3">关联已有随手记</h3>{!state!.entries.length ? <p className="text-xs text-muted">先写一条随手记，再回来把它作为证据。</p> : <ResearchForm label="添加证据" onSuccess={() => setMessage('证据已关联。')} onSave={async (data) => {
      const entryId = fieldText(data, 'entry'), type = fieldText(data, 'type'), note = fieldText(data, 'note')
      await commit((draft) => {
        const hypothesis = draft.hypotheses.find((item) => item.id === id), entry = draft.entries.find((entry) => entry.id === entryId)
        if (!hypothesis || !entry) throw new Error('想法或记录已不存在，请重新选择。')
        const evidenceId = researchId('E')
        draft.evidence.push({ id: evidenceId, hypothesisId: id, entryId, type, note: note || entry.currentText.slice(0, 120), createdAt: new Date().toISOString() })
        const key = type === 'support' ? 'supportingEvidence' : 'opposingEvidence'
        hypothesis[key] = [...(hypothesis[key] ?? []), evidenceId]; hypothesis.updatedAt = new Date().toISOString()
      })
    }}><ResearchField label="选择随手记"><select className="input" name="entry" required>{state!.entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.date} · {entry.currentText.slice(0, 45)}</option>)}</select></ResearchField><ResearchField label="这条记录提供了什么？"><select className="input" name="type"><option value="support">支持这个想法</option><option value="against">反对这个想法</option></select></ResearchField><ResearchField label="证据说明（可选）"><input className="input" name="note" /></ResearchField></ResearchForm>}</div>
    <div className="space-y-2">{evidence.map((item) => { const entry = state!.entries.find((entry) => entry.id === item.entryId); return <details key={item.id} className="rounded-xl bg-ink-800 p-3"><summary className="cursor-pointer text-xs"><span className={item.type === 'support' ? 'text-accent-dim' : 'text-warn'}>{item.type === 'support' ? '支持' : '反对'}</span> · {item.note}</summary><p className="text-xs text-muted mt-2 whitespace-pre-wrap break-words">{entry?.originalText ?? '关联的原始记录暂不可读取，证据说明仍保留。'}</p></details> })}</div>
  </div></Modal>
}
