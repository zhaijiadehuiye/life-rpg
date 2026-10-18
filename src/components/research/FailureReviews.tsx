import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useFailureReviews } from '../../lib/useFailureReviews'
import { addFailureFollowUp, saveFailureReview } from '../../lib/storage'
import { latestFollowUp, latestReview, OUTCOME_LABELS, REVIEW_FACTORS, reviewFactorCounts, reviewStatus, validReviewDate } from '../../lib/failureReviews'
import { addDays, formatChineseDate, todayKey } from '../../utils/date'
import { useNow } from '../../utils/useNow'
import { ResearchField } from '../ResearchUI'
import type { FailureReview, FailureReviewDraft, ReviewOutcome } from '../../types/failureReview'

export function FailureReviews() {
  const { reviews, error, refresh } = useFailureReviews()
  const [params, setParams] = useSearchParams()
  const today = todayKey(useNow())
  const rawDate = params.get('date') ?? today
  const date = validReviewDate(rawDate) && rawDate <= today ? rawDate : today
  const allDates = params.get('range') === 'all'
  const rows = reviews.filter((row) => allDates || latestReview(row).date === date).sort((a, b) => latestReview(b).date.localeCompare(latestReview(a).date) || b.createdAt.localeCompare(a.createdAt))
  const requested = reviews.find((row) => row.id === params.get('review'))
  const selected = requested ?? rows[0]
  const editor = useRef<HTMLDivElement>(null)
  const creating = params.get('new') === '1'
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (params.get('review') && window.matchMedia?.('(max-width: 1023px)').matches) editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [params])
  const stats = reviewFactorCounts(reviews, today)
  const navigate = (change: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(change).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value))
    next.set('view', 'failures'); setParams(next)
    setMessage('')
  }
  const selectDate = (next: string) => {
    if (validReviewDate(next) && next <= today) navigate({ date: next, range: null, review: null, new: null })
  }
  return <div className="space-y-4">
    {params.get('from') === 'today' && <Link className="inline-flex items-center gap-1 text-sm text-accent" to="/"><ChevronLeft size={16} /> 返回今天</Link>}
    {creating && params.get('from') !== 'today' && <button type="button" className="inline-flex items-center gap-1 text-sm text-accent" onClick={() => navigate({ new: null })}><ChevronLeft size={16} /> 返回复盘列表</button>}
    <div className={`${creating ? 'hidden lg:flex' : 'flex'} flex-wrap items-center justify-between gap-3`}><p className="text-sm text-muted">记录没按预期的事，给下次留一个办法。不需要每天完成。</p><button className="btn-primary" disabled={Boolean(error)} onClick={() => navigate({ new: '1', review: null })}><Plus size={15} /> 记一次复盘</button></div>
    {message && <p role="status" className="text-sm text-accent-dim">{message}</p>}
    {error ? <div className="card-pad space-y-3"><p role="alert" className="text-sm text-danger">{error}</p><button className="btn-ghost" onClick={refresh}>重新读取</button></div> : <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)] items-start">
      <div className={`space-y-4 ${creating ? 'hidden lg:block' : ''}`}>
        <section className="card-pad space-y-4" aria-label="复盘列表"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{allDates ? '全部失败复盘' : date === today ? '今天想复盘的事' : `${formatChineseDate(date)}的复盘`}</h2><span className="text-xs text-muted">{rows.length} 件</span></div>
          <div className="flex flex-wrap items-center gap-2"><button type="button" aria-label="前一天的复盘" className="btn-ghost !p-2" onClick={() => selectDate(addDays(date, -1))}><ChevronLeft size={16} /></button><input type="date" aria-label="复盘日期筛选" className="input !w-auto min-w-0 flex-1" max={today} value={date} onChange={(event) => selectDate(event.target.value)} /><button type="button" aria-label="后一天的复盘" disabled={date >= today} className="btn-ghost !p-2" onClick={() => selectDate(addDays(date, 1))}><ChevronRight size={16} /></button></div>
          <div className="flex gap-3 text-xs"><button className={`underline underline-offset-4 ${allDates ? 'text-muted' : 'text-accent'}`} aria-pressed={!allDates} onClick={() => navigate({ range: null, review: null, new: null })}>按日期查看</button><button className={`underline underline-offset-4 ${allDates ? 'text-accent' : 'text-muted'}`} aria-pressed={allDates} onClick={() => navigate({ range: 'all', review: null, new: null })}>查看全部日期</button></div>
          {!rows.length && <p className="text-sm text-muted leading-relaxed py-3">这段时间还没有复盘。没完成的任务不会自动算失败，休息也不需要解释。想留下一件事时，点「记一次复盘」。</p>}
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">{rows.map((row) => {
            const version = latestReview(row)
            return <button key={row.id} type="button" aria-pressed={!creating && selected?.id === row.id} className={`w-full rounded-xl border p-4 text-left space-y-2 ${!creating && selected?.id === row.id ? 'bg-mint/20 border-accent/50' : 'border-line hover:border-accent/30'}`} onClick={() => navigate({ review: row.id, new: null })}>
              <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-sm text-zinc-800 break-words min-w-0">{version.expected}</h3><span className="chip text-accent-dim shrink-0">{reviewStatus(row)}</span></div><p className="text-sm text-muted whitespace-pre-wrap break-words line-clamp-3">{version.actual}</p>
              <div className="flex flex-wrap gap-1.5">{version.factors.map((tag) => <span key={tag} className="chip">{tag}</span>)}</div>
              {version.nextStep && <p className="text-xs text-muted break-words">下次：{version.nextStep}</p>}<p className="text-xs text-muted">{formatChineseDate(version.date)}</p>
            </button>
          })}</div>
        </section>
        <section className="card-pad space-y-3" aria-label="复盘标签统计"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold text-sm">最近反复出现的情况</h2><span className="text-xs text-muted">近 7 天 · {stats.total} 次复盘</span></div>
          {!stats.counts.length ? <p className="text-sm text-muted">记录时可以选择可能的影响因素，积累几次后在这里回看。</p> : stats.counts.map(([tag, count]) => <div key={tag} className="flex items-center gap-3 text-sm"><span className="w-20 shrink-0 break-words">{tag}</span><div className="h-2 flex-1 bg-ink-700 rounded-full overflow-hidden"><div className="h-full bg-accent/70 rounded-full" style={{ width: `${count / stats.total * 100}%` }} /></div><span className="text-muted shrink-0">{count} 次</span></div>)}
          <p className="text-xs text-muted leading-relaxed">只按你选择的标签统计，同一件事可选多个标签；次数不是失败率，也不代表已经确定原因。</p>
        </section>
      </div>
      <div ref={editor} className="space-y-4 scroll-mt-4">
        {(creating || selected) ? <FailureReviewEditor key={creating ? `new-${date}` : selected!.id} review={creating ? undefined : selected} date={date} onSaved={(id, savedDate) => { setMessage('复盘已保存在本机，原来的日志和旧版本都保留。'); const next = new URLSearchParams(params); next.delete('new'); next.set('review', id); next.set('date', savedDate); setParams(next, { replace: true }) }} onCancel={() => { if (creating) navigate({ new: null }) }} /> : <section className="card-pad text-sm text-muted leading-relaxed">先记发生了什么，原因和下次的办法可以以后补充。你的原日记保持原样，复盘不会扣分，也不会自动完成任务。</section>}
      </div>
    </div>}
  </div>
}

function FailureReviewEditor({ review, date, onSaved, onCancel }: { review?: FailureReview; date: string; onSaved: (id: string, date: string) => void; onCancel: () => void }) {
  const initial = review ? latestReview(review) : { date, expected: '', actual: '', factors: [], nextStep: '' }
  const [draft, setDraft] = useState<FailureReviewDraft>(initial)
  // Keep the version that was opened; a cross-tab refresh must never replace unsaved input.
  const [baseVersion, setBaseVersion] = useState(review ? latestReview(review).id : undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const change = <K extends keyof FailureReviewDraft>(key: K, value: FailureReviewDraft[K]) => { setDraft((old) => ({ ...old, [key]: value })); setSaved(false) }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await saveFailureReview(draft, review?.id, baseVersion)
      setBaseVersion(result.versionId)
      setSaved(true); onSaved(result.id, draft.date)
    } catch (err) { setError(err instanceof Error ? err.message : '保存失败，输入仍在，请重试。') }
    finally { setBusy(false) }
  }
  const currentVersion = review ? latestReview(review).id : undefined
  const stale = Boolean(review && currentVersion !== baseVersion)
  return <>
    <section className="card-pad space-y-4" aria-label="失败复盘表单"><div><h2 className="text-lg font-semibold">{review ? '查看 / 补充复盘' : '记一次失败复盘'}</h2><p className="text-xs text-muted mt-1">先说发生了什么，再想下一步。离开页面前记得保存。</p></div>
      {stale && <div className="space-y-2"><p role="alert" className="text-sm text-danger">这条复盘已有新版本，你的输入仍保留。请先核对下方版本历史。</p><button type="button" className="btn-ghost" onClick={() => { if (review && window.confirm('将用最新版本替换本页未保存的输入。请先复制需要保留的文字；已保存的所有版本不会删除。')) { setDraft(latestReview(review)); setBaseVersion(latestReview(review).id); setSaved(false); setError('') } }}>载入最新版本</button></div>}
      <form className="space-y-5" onSubmit={(event) => { void submit(event) }}>
        <ResearchField label="这件事发生在哪一天？"><input type="date" aria-label="复盘记录日期" required max={todayKey()} className="input" value={draft.date} onChange={(event) => change('date', event.target.value)} /></ResearchField>
        <ReviewStep number={1} label="原本想做什么？"><textarea aria-label="原本想做什么" required className="input mt-2" rows={2} placeholder="例如：想在晚饭后学30分钟英语" value={draft.expected} onChange={(event) => change('expected', event.target.value)} /></ReviewStep>
        <ReviewStep number={2} label="实际发生了什么？"><textarea aria-label="实际发生了什么" required className="input mt-2" rows={3} placeholder="写具体发生的事，不用给自己下结论" value={draft.actual} onChange={(event) => change('actual', event.target.value)} /></ReviewStep>
        <fieldset><legend className="flex items-center gap-2 text-sm font-semibold"><span className="w-6 h-6 rounded-full bg-accent text-white inline-flex items-center justify-center text-xs">3</span>可能卡在哪里？</legend><p className="text-xs text-muted mt-2">可多选，也可以先不确定。这些只是待验证的因素。</p><div className="flex flex-wrap gap-2 mt-3">{[...new Set([...REVIEW_FACTORS, ...draft.factors])].map((factor) => <button type="button" key={factor} aria-pressed={draft.factors.includes(factor)} className={`research-tab !text-xs ${draft.factors.includes(factor) ? 'research-tab-active' : ''}`} onClick={() => change('factors', draft.factors.includes(factor) ? draft.factors.filter((tag) => tag !== factor) : [...draft.factors, factor])}>{factor}</button>)}</div></fieldset>
        <ReviewStep number={4} label="下次只改一件事（可选）"><textarea aria-label="下次只改一件事" className="input mt-2" rows={3} placeholder="例如：晚饭后手机放远，先跟读一句英语，用2分钟开始" value={draft.nextStep} onChange={(event) => change('nextStep', event.target.value)} /><p className="text-xs text-muted mt-2">暂时没想到也能保存，之后随时补充。</p></ReviewStep>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}{saved && <p role="status" className="text-sm text-accent-dim">复盘已保存，旧版本仍保留。</p>}
        <div className="flex flex-wrap justify-end items-center gap-3">{!review && <button type="button" disabled={busy} className="btn-ghost" onClick={onCancel}>取消</button>}<button type="submit" disabled={busy || stale || saved} className="btn-primary">{busy ? '正在保存…' : saved ? '已保存' : '保存复盘'}</button></div>
      </form><p className="text-xs text-muted">复盘单独保存，不改变原日记、经验值或任务状态。</p>
    </section>
    {review && <FollowUp key={latestReview(review).id} review={review} />}
    {review && <details className="card-pad"><summary className="cursor-pointer text-sm text-accent">修改与回看历史（{review.versions.length} 个版本 · {review.followUps.length} 次回看）</summary><div className="mt-4 space-y-4">{review.versions.map((row, index) => <article key={row.id} className="border-b border-line pb-4 last:border-0 space-y-2 text-sm"><h3 className="font-semibold">第 {index + 1} 版 · {formatChineseDate(row.date)}</h3><p className="text-xs text-muted">保存于 {new Date(row.savedAt).toLocaleString('zh-CN')}</p><p className="whitespace-pre-wrap break-words">原本：{row.expected}</p><p className="whitespace-pre-wrap break-words">实际：{row.actual}</p><p className="text-xs text-muted break-words">可能因素：{row.factors.join('、') || '尚未选择'}</p><p className="whitespace-pre-wrap break-words">想试试：{row.nextStep || '暂未填写'}</p>{review.followUps.filter((item) => item.versionId === row.id).map((item) => <div key={item.id} className="rounded-xl bg-mint/20 p-3"><p className="text-xs text-accent-dim">{new Date(item.createdAt).toLocaleString('zh-CN')} · {OUTCOME_LABELS[item.outcome]}</p>{item.note && <p className="mt-1 whitespace-pre-wrap break-words">{item.note}</p>}</div>)}</article>)}</div></details>}
  </>
}

function ReviewStep({ number, label, children }: { number: number; label: string; children: React.ReactNode }) {
  return <div><div className="flex items-center gap-2 text-sm font-semibold"><span className="w-6 h-6 rounded-full bg-accent text-white inline-flex items-center justify-center text-xs">{number}</span>{label}</div>{children}</div>
}

function FollowUp({ review }: { review: FailureReview }) {
  const previous = latestFollowUp(review)
  const [outcome, setOutcome] = useState<ReviewOutcome | ''>(previous?.outcome ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const version = latestReview(review)
  if (!version.nextStep) return null
  return <section className="card-pad space-y-3" aria-label="回看这次的调整"><h2 className="text-base font-semibold">回看这次的调整</h2><p className="text-sm text-muted whitespace-pre-wrap break-words">{version.nextStep}</p><p className="text-sm">这个办法有帮助吗？</p><div className="flex flex-wrap gap-2">{Object.entries(OUTCOME_LABELS).map(([key, label]) => <button type="button" key={key} disabled={busy} className={`research-tab !text-xs ${outcome === key ? 'research-tab-active' : ''}`} aria-pressed={outcome === key} onClick={() => { setOutcome(key as ReviewOutcome); setSaved(false) }}>{label}</button>)}</div>
    <ResearchField label="这次的观察（可选）"><textarea aria-label="回看观察" rows={2} className="input" placeholder="试过以后发生了什么？还没尝试也没关系。" value={note} onChange={(event) => { setNote(event.target.value); setSaved(false) }} /></ResearchField>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}{saved && <p role="status" className="text-sm text-accent-dim">回看已保存，之前的观察仍保留。</p>}
    <button className="btn-ghost" disabled={!outcome || busy || saved} onClick={() => { if (!outcome) return; setBusy(true); setError(''); void addFailureFollowUp(review.id, version.id, outcome, note).then(() => { setSaved(true); setNote('') }).catch((err: unknown) => { setError(err instanceof Error ? err.message : '保存失败，输入仍在。') }).finally(() => setBusy(false)) }}>{busy ? '正在保存…' : '保存这次回看'}</button>
    <p className="text-xs text-muted">没帮助时可以换个办法；还没尝试不会扣分。</p>
  </section>
}
