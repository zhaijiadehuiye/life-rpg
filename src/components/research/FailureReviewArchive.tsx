import { useRef, useState } from 'react'
import { useFailureReviews } from '../../lib/useFailureReviews'
import { failureReviewBackup, mergeFailureReviews, parseFailureReviewImport } from '../../lib/failureReviews'
import { importFailureReviews, readFailureReviewPayload } from '../../lib/storage'
import type { FailureReviewPayload } from '../../types/failureReview'
import { Modal } from '../Modal'
import { todayKey } from '../../utils/date'

export function FailureReviewArchive() {
  const { reviews, error: readError } = useFailureReviews()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<FailureReviewPayload | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const merge = preview ? mergeFailureReviews(reviews, preview.reviews) : null
  return <section className="card-pad space-y-4" aria-label="失败复盘备份"><div><h2 className="text-base font-semibold">失败复盘备份</h2><p className="text-sm text-muted mt-1">{reviews.length} 件事，包含每次修改和回看。单独保存，不随角色档案重建而清空。</p></div>
    <div className="flex flex-wrap gap-2"><button className="btn-ghost" disabled={Boolean(readError)} onClick={() => {
      setError('')
      try {
        const url = URL.createObjectURL(new Blob([JSON.stringify(readFailureReviewPayload(), null, 2)], { type: 'application/json' }))
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `life-os-failure-reviews-${todayKey()}.json`; anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch { setError('复盘档案暂时无法导出，请保留原存档后重试。') }
    }}>单独导出失败复盘</button><button className="btn-ghost" disabled={Boolean(readError)} onClick={() => input.current?.click()}>导入失败复盘</button><input ref={input} aria-label="导入失败复盘文件" type="file" accept="application/json,.json" className="hidden" onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
      setError(''); setMessage(''); setPreview(null)
      try { setPreview(parseFailureReviewImport(await file.text())) }
      catch { setError('文件没有可读取的失败复盘档案，当前记录未改变。可使用新整站备份或单独的失败复盘 JSON。') }
    }} /></div>
    <p className="text-xs text-muted leading-relaxed">整站 JSON 也包含这部分。这里只补充导入；相同内容跳过，同编号的不同内容另存副本，旧版本不会覆盖。</p>
    {(readError || error) && <p role="alert" className="text-sm text-danger">{readError || error}</p>}{message && <p role="status" className="text-sm text-accent-dim">{message}</p>}
    {preview && merge && <Modal open title="核对失败复盘导入" onClose={() => { if (!busy) setPreview(null) }}><div className="space-y-4 text-sm"><p>文件包含 {preview.reviews.length} 件事，预计补充 {merge.added} 件，跳过 {merge.skipped} 件重复内容。{merge.conflicts > 0 && `${merge.conflicts} 件存在同编号的不同内容，将作为副本保留。`}</p><p className="text-xs text-muted">只导入失败复盘及其修改和回看历史，原日记、原始材料、任务和经验值都保持原样。</p>{error && <p role="alert" className="text-danger">{error}</p>}<button disabled={busy} className="btn-primary" onClick={() => { setBusy(true); setError(''); void importFailureReviews(failureReviewBackup(preview.reviews)).then(() => { setPreview(null); setMessage('失败复盘已补充导入，原有复盘和所有旧版本保留。') }).catch((err: unknown) => setError(err instanceof Error ? err.message : '导入失败，原数据仍在。')).finally(() => setBusy(false)) }}>{busy ? '正在导入…' : '确认补充失败复盘'}</button></div></Modal>}
  </section>
}
