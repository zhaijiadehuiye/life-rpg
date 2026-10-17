import { useRef, useState } from 'react'
import { useResearch } from '../../lib/useResearch'
import { ResearchBoundary } from '../ResearchUI'
import { useGameStore } from '../../store/useGameStore'
import { exportState } from '../../lib/storage'
import { mergeResearchImport, parseResearchImport, researchDate, researchExport, researchId } from '../../lib/research'
import { RESEARCH_COLLECTIONS } from '../../lib/historianStorage'
import { Modal } from '../Modal'
import { todayKey } from '../../utils/date'
import type { ResearchState } from '../../types/historian'

function downloadFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ResearchArchive() {
  const { state, commit } = useResearch()
  const game = useGameStore()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ResearchState | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const merge = state && preview ? mergeResearchImport(state, preview) : null
  const action = async (operation: () => Promise<void>, text: string) => {
    setError(''); setBusy(true)
    try { await operation(); setMessage(text) } catch (error) { setError(error instanceof Error ? error.message : '操作未保存，原档案仍保留。') }
    finally { setBusy(false) }
  }
  return <ResearchBoundary><section className="card-pad space-y-4" aria-label="记录与复盘备份">
    <div><h2 className="text-base font-semibold">记录与复盘档案</h2><p className="text-sm text-muted mt-1">随手记、原文修订、想法与证据、实验、预测和复盘一起备份。换设备或清理浏览器前先导出。</p></div>
    <div className="flex flex-wrap gap-2 text-xs text-muted"><span>{state?.entries.length ?? 0} 条随手记</span><span>· {state?.hypotheses.length ?? 0} 个想法</span><span>· {state?.experiments.length ?? 0} 个实验</span><span>· {state?.predictions.length ?? 0} 条预测</span></div>
    <div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={() => {
      downloadFile(`life-os-all-${todayKey()}.json`, JSON.stringify({ product: 'Life OS', version: 1, exportedAt: new Date().toISOString(), game: game.initialized ? JSON.parse(exportState(game)) : null, historian: JSON.parse(researchExport(state!)) }, null, 2), 'application/json')
    }}>导出整站 JSON 备份</button><button className="btn-ghost" onClick={() => downloadFile(`personal-historian-${todayKey()}.json`, researchExport(state!), 'application/json')}>单独导出记录档案</button><button className="btn-ghost" onClick={() => input.current?.click()}>导入记录档案</button><input ref={input} aria-label="导入记录档案文件" type="file" accept="application/json,.json" className="hidden" onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
      setError('')
      try { const text = await file.text(), parsed = JSON.parse(text); setPreview(parseResearchImport(JSON.stringify(parsed.historian ?? parsed))) }
      catch (error) { setError(error instanceof Error ? error.message : '无法读取 JSON，当前数据未改变。') }
    }} /></div>
    <p className="text-xs text-muted leading-relaxed">整站备份包含角色与生活记录，以及随手记与复盘档案。恢复时在本页两个区域分别选择同一个文件，并核对预览。记录档案只补充导入，不覆盖现有原文或修订。</p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}{message && <p role="status" className="text-sm text-accent-dim">{message}</p>}
    <details><summary className="cursor-pointer text-xs text-accent">其他导出格式和本机快照</summary><div className="space-y-4 mt-4"><div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => {
      const sections = ['# 我的记录与复盘', ...state!.entries.map((entry) => `## ${entry.date}\n\n${entry.originalText}\n\n标签：${entry.tags?.join('、') ?? ''}\n\n### 修订历史\n\n${(entry.revisions ?? []).map((revision, index) => `#### 第 ${index + 1} 版 · ${revision.createdAt}\n\n${revision.text}`).join('\n\n')}`), '# 想法与证据', ...state!.hypotheses.map((row) => `## ${row.title}\n\n${row.description}\n\n当前相信程度：${row.confidence}%\n\n${row.confidenceHistory?.map((item) => `${item.date} · ${item.confidence}% · ${item.reason}`).join('\n\n')}`), '# 实验', ...state!.experiments.map((row) => `## ${row.title}\n\n${row.question}\n\n${row.conclusion}\n\n${(row.observations ?? []).map((item) => `${item.date} · ${item.note}`).join('\n\n')}`)]
      downloadFile(`life-os-notes-${todayKey()}.md`, sections.join('\n\n'), 'text/markdown;charset=utf-8')
    }}>导出 Markdown</button><button className="btn-ghost" onClick={() => {
      const cell = (text: unknown) => { const value = String(text ?? ''); return `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"` }
      const rows = [['id', 'date', 'original_text', 'current_text', 'tags', 'created_at'], ...state!.entries.map((entry) => [entry.id, entry.date, entry.originalText, entry.currentText, entry.tags?.join('|'), entry.createdAt])]
      downloadFile(`life-os-notes-${todayKey()}.csv`, '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\n'), 'text/csv;charset=utf-8')
    }}>导出记录 CSV</button><button className="btn-ghost" disabled={busy} onClick={() => { void action(async () => { await commit((draft) => { const snapshot = structuredClone({ ...draft, backups: [] }); draft.backups.unshift({ id: researchId('backup'), createdAt: new Date().toISOString(), entryCount: draft.entries.length, hypothesisCount: draft.hypotheses.length, snapshot }) }) }, '已创建本机快照。仍建议下载一份 JSON，避免清理浏览器时丢失。') }}>创建本机快照</button></div><p className="text-xs text-muted">Markdown 和 CSV 方便阅读；要完整恢复所有数据，请使用 JSON。本机快照仍在同一个浏览器里。</p>
      {(state?.backups ?? []).map((backup) => <div key={backup.id} className="flex flex-wrap justify-between gap-3 rounded-xl bg-ink-800 p-3 text-xs"><span>{researchDate(backup.createdAt)} · {backup.entryCount} 条记录</span><button className="text-accent underline underline-offset-4" onClick={() => { try { setPreview(parseResearchImport(JSON.stringify(backup.snapshot))) } catch { setError('这个快照无法完整读取，原数据未改动。') } }}>预览并补回快照记录</button></div>)}
    </div></details>
    <details><summary className="cursor-pointer text-xs text-muted">旧版兼容入口</summary><p className="text-xs text-muted leading-relaxed mt-2">旧版自我历史学的原文和修订仍在原数据库中。主应用已直接读取；不同域名需要你先导出再导入。</p><a className="inline-flex text-xs text-accent underline underline-offset-4 mt-2" href={new URL('personal-historian/index.html', document.baseURI).href} target="_blank" rel="noopener noreferrer">打开旧版页面 ↗</a></details>
    {preview && merge && <Modal open title="核对导入内容" onClose={() => { if (!busy) setPreview(null) }}><div className="space-y-4 text-sm"><p>文件包含 {preview.entries.length} 条随手记、{preview.hypotheses.length} 个想法、{preview.experiments.length} 个实验。</p><p>预计补充 {merge.added} 项，跳过 {merge.skipped} 项重复内容。{merge.conflicts > 0 && `有 ${merge.conflicts} 项编号相同但内容不同，会作为独立副本保留并重连证据。`}</p><p className="text-xs text-muted">当前原文、修订和其他档案都会保留。这里不恢复角色与计划，角色与生活记录需在本页对应区域单独核对。</p>{error && <p role="alert" className="text-danger">{error}</p>}<button className="btn-primary" disabled={busy} onClick={() => { void action(async () => {
      await commit((draft) => { const result = mergeResearchImport(draft, preview); for (const key of RESEARCH_COLLECTIONS) Object.assign(draft, { [key]: result.state[key] }); Object.entries(result.state).forEach(([key, value]) => { if (!Object.prototype.hasOwnProperty.call(draft, key)) draft[key] = value }) }); setPreview(null)
    }, '记录档案已补充导入，原记录和修订保持保留。') }}>{busy ? '正在保存…' : '确认补充导入'}</button></div></Modal>}
  </section></ResearchBoundary>
}
