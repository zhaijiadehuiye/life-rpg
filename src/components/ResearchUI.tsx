import { cloneElement, isValidElement, useId, useState, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp } from 'lucide-react'
import { useResearch } from '../lib/useResearch'
import { Modal } from './Modal'
import { analyzeResearchEntry, appendResearchRevision, researchDate } from '../lib/research'

export function ResearchHeader({ title, description }: { title: string; description: string }) {
  return <header className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-zinc-900">{title}</h1><p className="text-sm text-muted mt-2 leading-relaxed">{description}</p></div><Link to="/guide" className="shrink-0 hidden sm:inline-flex items-center gap-1 text-xs text-accent py-2"><CircleHelp size={15} /> 使用引导</Link></header>
}

export function ResearchBoundary({ children }: { children: ReactNode }) {
  const { loading, error, state, refresh, mode } = useResearch()
  if (loading) return <p className="card-pad text-sm text-muted" role="status">正在读取本机记录…</p>
  if (!state) return <div className="card-pad space-y-3"><p role="alert" className="text-sm text-danger">{error || '档案暂不可读取，原数据未改动。'}</p><button className="btn-ghost" onClick={() => { void refresh() }}>重新读取</button></div>
  return <>{error && <p role="alert" className="text-sm text-danger">{error} · 当前显示上次读取的内容，未保存的输入仍保留。</p>}{mode === 'localStorage' && <p className="text-xs text-muted rounded-xl bg-peach/50 p-3">当前使用本机备用存储，旧记录仍保存在原位置。请在「设置与备份」定期导出。</p>}{children}</>
}

export function EmptyResearch({ children, to, action }: { children: ReactNode; to?: string; action?: string }) {
  return <div className="card-pad text-center py-10"><p className="text-sm text-muted leading-relaxed">{children}</p>{to && <Link className="btn-ghost mt-4" to={to}>{action ?? '写第一条记录'}</Link>}</div>
}

export function ResearchField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const generated = useId()
  const child = isValidElement(children) ? children as ReactElement<{ id?: string; 'aria-describedby'?: string }> : null
  const id = child?.props.id ?? generated
  return <div className="text-sm text-zinc-700"><label htmlFor={id}>{label}</label><div className="mt-1.5">{child ? cloneElement(child, { id, 'aria-describedby': hint ? `${id}-hint` : child.props['aria-describedby'] }) : children}</div>{hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5 leading-relaxed">{hint}</p>}</div>
}

export function ResearchForm({ onSave, children, label = '保存', onSuccess }: { onSave: (data: FormData) => Promise<void>; children: ReactNode; label?: string; onSuccess?: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(''); setBusy(true)
    try { await onSave(data); onSuccess?.() } catch (err) { setError(err instanceof Error ? err.message : '保存失败，请先备份并检查浏览器存储。输入仍在。') }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="space-y-4">{children}{error && <p role="alert" className="text-sm text-danger">{error}</p>}<button type="submit" disabled={busy} className="btn-primary">{busy ? '正在保存…' : label}</button></form>
}

export function ResearchEntryDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, commit } = useResearch()
  const entry = state?.entries.find((row) => row.id === id)
  const [editing, setEditing] = useState(false)
  const [expected, setExpected] = useState(entry?.currentText ?? '')
  const [draft, setDraft] = useState(entry?.currentText ?? '')
  const [analysisError, setAnalysisError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  if (!entry) return <Modal open title="记录暂不可读取" onClose={onClose}><p className="text-sm text-muted">请关闭后重新打开，原档案未改动。</p></Modal>
  return <Modal open title={`${researchDate(entry.date)} · 随手记`} onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-zinc-800">{entry.currentText}</p>
      <div className="flex flex-wrap gap-2 text-xs text-muted">{(entry.tags ?? []).map((tag) => <span className="chip" key={tag}>#{tag}</span>)}<span>{entry.revisions?.length || 1} 个版本</span></div>
      {!editing ? <button className="btn-ghost" onClick={() => { setExpected(entry.currentText); setDraft(entry.currentText); setEditing(true) }}>补充 / 修订</button> : <ResearchForm label="保存新版本" onSave={async () => {
        await commit((state) => appendResearchRevision(state, id, draft, expected)); setExpected(draft.trim()); setEditing(false)
      }}><ResearchField label="补充后的完整内容" hint="会追加新版本，首次原文和已有修订都会保留。"><textarea aria-label="修订内容" rows={5} className="input" required value={draft} onChange={(event) => setDraft(event.target.value)} /></ResearchField><button type="button" className="text-xs text-muted underline" onClick={() => setEditing(false)}>取消修订</button></ResearchForm>}
      <details className="border-t border-line pt-3"><summary className="text-sm text-accent cursor-pointer">首次原文与修订历史</summary><div className="space-y-3 mt-3">
        <div className="bg-ink-800 p-3 rounded-xl"><div className="text-xs text-muted mb-1">首次原文 · 始终保留</div><p className="text-sm whitespace-pre-wrap break-words">{entry.originalText}</p></div>
        {(entry.revisions ?? []).map((revision, index) => <div key={revision.id} className="border-l-2 border-line pl-3"><div className="text-xs text-muted">第 {index + 1} 版 · {researchDate(revision.createdAt)}</div><p className="text-sm whitespace-pre-wrap break-words mt-1">{revision.text}</p></div>)}
      </div></details>
      <details className="border-t border-line pt-3"><summary className="text-sm text-accent cursor-pointer">整理文字与可能的线索</summary><div className="space-y-3 mt-3 text-sm">
        <p className="text-xs text-muted">本地文字摘录仅供你核对，和原文分开保存。修订原文后可主动重新整理。</p>
        {entry.analysis && <><div><h4 className="text-xs text-muted mb-1">原文中的陈述 · 待核对</h4><ul className="list-disc pl-5 space-y-1">{(entry.analysis.facts ?? []).map((fact, index) => <li key={index}>{fact}</li>)}</ul></div>{entry.analysis.interpretation && <p><span className="text-muted">当时的解释：</span>{entry.analysis.interpretation}</p>}{(entry.analysis.alternatives ?? []).map((line, index) => <p key={index}>{line}</p>)}{(entry.analysis.cannotConclude ?? []).map((line, index) => <p key={index} className="text-xs text-muted">{line}</p>)}</>}
        {analysisError && <p role="alert" className="text-danger">{analysisError}</p>}
        <button className="btn-ghost" disabled={analyzing} onClick={async () => {
          setAnalyzing(true); setAnalysisError('')
          try { await commit((state) => { const row = state.entries.find((row) => row.id === id); if (row) analyzeResearchEntry(row) }) }
          catch (error) { setAnalysisError(error instanceof Error ? error.message : '整理未保存，请重试。') }
          finally { setAnalyzing(false) }
        }}>{analyzing ? '正在整理…' : entry.analysis ? '重新整理文字' : '整理这段文字'}</button>
      </div></details>
    </div>
  </Modal>
}
