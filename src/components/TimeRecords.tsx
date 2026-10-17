import { useState, type FormEvent } from 'react'
import { Moon, Plus } from 'lucide-react'
import { Modal } from './Modal'
import { useGameStore } from '../store/useGameStore'
import { ACTIVITY_CATEGORIES, TIME_CATEGORIES, entriesForDate, entryLabel, formatDuration, interval, localDateTime, sleepForDate, timestampFromLocal } from '../lib/dailyTime'
import { addDays } from '../utils/date'
import type { TimeCategory, TimeEntry } from '../types'

export function TimeEntryEditor({ date, sleep = false, entry, onClose }: { date: string; sleep?: boolean; entry?: TimeEntry; onClose: () => void }) {
  const s = useGameStore()
  const [category, setCategory] = useState<TimeCategory>(entry?.category ?? (sleep ? 'sleep' : 'work'))
  const [start, setStart] = useState(() => entry ? localDateTime(entry.startedAt) : { date: sleep ? addDays(date, -1) : date, time: '' })
  const [end, setEnd] = useState(() => entry ? localDateTime(entry.endedAt) : { date, time: '' })
  const [note, setNote] = useState(entry?.note ?? '')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const startedAt = timestampFromLocal(start.date, start.time)
    const endedAt = timestampFromLocal(end.date, end.time)
    if (!startedAt || !endedAt) { setError('请填写有效的开始、结束日期和时间。'); return }
    const result = s.saveTimeEntry({ id: entry?.id, category, startedAt, endedAt, note })
    if (!result.ok) setError(result.error ?? '保存失败，请重试。')
    else onClose()
  }
  const range = start.time && end.time ? interval({ startedAt: timestampFromLocal(start.date, start.time) ?? '', endedAt: timestampFromLocal(end.date, end.time) ?? '' }) : null
  return <Modal open title={entry ? '修改时段' : sleep ? '补记睡眠' : '记一段活动'} onClose={onClose}>
    <form onSubmit={submit} onChange={() => { setError(''); setConfirmDelete(false) }} className="space-y-4">
      <p className="text-xs text-muted">只记已经发生的时间，按本机时区显示。跨午夜请分别选择日期；午睡也可另记一段。</p>
      <label className="block text-sm">类型<select aria-label="时段类型" className="input mt-1.5" value={category} onChange={(e) => setCategory(e.target.value as TimeCategory)}>
        {Object.entries(TIME_CATEGORIES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
      </select></label>
      <fieldset><legend className="text-sm">{category === 'sleep' ? '入睡' : '开始'}</legend><div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2 mt-1.5">
        <input required aria-label="开始日期" type="date" className="input min-w-0" value={start.date} onChange={(e) => setStart({ ...start, date: e.target.value })} />
        <input required aria-label="开始时间" type="time" className="input min-w-0" value={start.time} onChange={(e) => setStart({ ...start, time: e.target.value })} />
      </div></fieldset>
      <fieldset><legend className="text-sm">{category === 'sleep' ? '醒来' : '结束'}</legend><div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2 mt-1.5">
        <input required aria-label="结束日期" type="date" className="input min-w-0" value={end.date} onChange={(e) => setEnd({ ...end, date: e.target.value })} />
        <input required aria-label="结束时间" type="time" className="input min-w-0" value={end.time} onChange={(e) => setEnd({ ...end, time: e.target.value })} />
      </div></fieldset>
      <p className="text-sm text-accent-dim">时长：{range ? formatDuration((range[1] - range[0]) / 60_000) : '填写时间后显示'}</p>
      <label className="block text-sm">备注 <span className="text-muted text-xs">（可选）</span><textarea aria-label="时段备注" className="input mt-1.5" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：午睡、读书、散步……" /></label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full" type="submit">保存时段</button>
      {entry && <div className="border-t border-line pt-3 text-sm">
        {confirmDelete ? <div><p className="text-muted mb-2">确定删除这段记录？其他记录会保留。</p><button type="button" className="btn-ghost text-danger" onClick={() => {
          const result = s.deleteTimeEntry(entry.id)
          if (result.ok) onClose(); else setError(result.error ?? '删除失败')
        }}>确定删除</button><button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>取消</button></div>
          : <button type="button" className="text-danger underline underline-offset-2" onClick={() => setConfirmDelete(true)}>删除这段记录</button>}
      </div>}
    </form>
  </Modal>
}

export function TimeRecordList({ date, onlySleep = false }: { date: string; onlySleep?: boolean }) {
  const entries = useGameStore((s) => s.timeEntries)
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const list = entriesForDate(entries ?? [], date).filter((entry) => !onlySleep || entry.category === 'sleep')
  return <>
    <div className="space-y-2">
      {!list.length && <p className="text-xs text-muted py-2">{onlySleep ? '还没有睡眠时段，可填写昨晚的入睡和今天的醒来时间。' : '还没有时段记录，想起来时再补记就好。'}</p>}
      {list.map((entry) => <div key={entry.id} className="flex items-center gap-2 rounded-xl bg-ink-800 p-3">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TIME_CATEGORIES[entry.category]?.color }} />
        <div className="min-w-0 flex-1"><div className="text-xs text-zinc-700">{TIME_CATEGORIES[entry.category]?.label ?? '未知类型'} · {entryLabel(entry)}</div>
          {entry.note && <p className="text-xs text-muted whitespace-pre-wrap break-words mt-1">{entry.note}</p>}</div>
        <button className="text-xs text-accent p-2 shrink-0 underline underline-offset-2" onClick={() => setEditing(entry)} aria-label={`修改${TIME_CATEGORIES[entry.category]?.label ?? ''} ${entryLabel(entry)}`}>修改</button>
      </div>)}
    </div>
    {editing && <TimeEntryEditor date={date} entry={editing} onClose={() => setEditing(null)} />}
  </>
}

export function SleepRecordSection({ date }: { date: string }) {
  const s = useGameStore()
  const sleep = sleepForDate(s, date)
  const [open, setOpen] = useState(false)
  return <section className="card-pad space-y-3">
    <div className="flex items-center justify-between gap-3"><div><h2 className="label flex items-center gap-2"><Moon size={16} /> 睡眠记录</h2><p className="text-xs text-muted mt-1">睡眠按醒来的日期归属；与首页共用，保存后立即更新图表。</p></div><button type="button" className="btn-ghost shrink-0" onClick={() => setOpen(true)}><Plus size={14} /> 补记睡眠</button></div>
    {sleep.source === 'reported' && <p className="text-sm text-muted">旧版自报睡眠 {formatDuration(sleep.minutes)}，原数据保留。补记起止时间后，图表优先使用时段。</p>}
    <TimeRecordList date={date} onlySleep />
    {open && <TimeEntryEditor date={date} sleep onClose={() => setOpen(false)} />}
  </section>
}

export function ActivityRecordSection({ date }: { date: string }) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(date)
  return <section className="card-pad space-y-3">
    <div className="flex items-center justify-between gap-3"><div><h2 className="label">时间记录</h2><p className="text-xs text-muted mt-1">{ACTIVITY_CATEGORIES.map((key) => TIME_CATEGORIES[key].label).join('、')}，按起止时间统计。</p></div><button type="button" className="btn-ghost shrink-0" onClick={() => setOpen(true)}><Plus size={14} /> 记活动</button></div>
    <label className="flex items-center gap-3 text-xs text-muted">查看日期<input aria-label="查看时段日期" className="input max-w-48" type="date" max={date} value={selectedDate} onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value) }} /></label>
    <TimeRecordList date={selectedDate} />
    {open && <TimeEntryEditor date={selectedDate} onClose={() => setOpen(false)} />}
  </section>
}
