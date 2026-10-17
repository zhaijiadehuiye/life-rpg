import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sunrise, Star, Clock3, Plus, Utensils, Footprints, NotebookPen, Cloud } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { addDays, todayKey } from '../utils/date'
import { useNow } from '../utils/useNow'
import { allocationForDate, clockLabel, formatDuration, localDateTime, sleepForDate, sleepTimeline } from '../lib/dailyTime'
import { TimeEntryEditor, TimeRecordList } from './TimeRecords'
import type { TimeEntry } from '../types'

export function LifeOverview() {
  const s = useGameStore()
  const now = useNow()
  const date = todayKey(now)
  const sleep = sleepForDate(s, date, now)
  const allocation = allocationForDate(s.timeEntries ?? [], date, now)
  const timeline = sleepTimeline(s.timeEntries ?? [], date, now)
  const log = s.logs.find((entry) => entry.date === date)
  const [editor, setEditor] = useState<'sleep' | 'activity' | TimeEntry | null>(null)
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(date, index - 6)
    return { date: day, ...sleepForDate(s, day, now) }
  })
  const knownDays = week.filter((day) => day.minutes !== null)
  const average = knownDays.length ? knownDays.reduce((sum, day) => sum + day.minutes!, 0) / knownDays.length : null
  const max = Math.max(600, ...knownDays.map((day) => day.minutes!))
  const exercise = allocation.totals.exercise
  const editSleep = () => setEditor(sleep.main ?? 'sleep')
  const dayHours = allocation.dayMinutes / 60

  return <div className="space-y-4" data-testid="life-overview">
    <section className="card-pad">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-semibold text-zinc-800">今日生活概览</h2>
        <Link to="/journal" className="text-xs text-accent underline underline-offset-4 shrink-0">补记 / 修改 →</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button className="life-stat bg-lav/55 text-left" onClick={editSleep} aria-label="查看或补记睡眠">
          <span className="life-stat-label"><Moon size={15} /> 睡眠时长</span>
          <strong className="life-stat-value">{formatDuration(sleep.minutes)}</strong>
          <span className="life-stat-hint">{sleep.source === 'interval' ? '按入睡与醒来估算' : sleep.source === 'reported' ? '旧版自报 · 可补记时段' : '补记昨晚睡眠 →'}</span>
        </button>
        <button className="life-stat bg-ink-800 text-left" onClick={editSleep} aria-label="查看或补记入睡时间">
          <span className="life-stat-label"><Clock3 size={15} /> 入睡时间</span>
          <strong className="life-stat-value">{sleep.main ? localDateTime(sleep.main.startedAt).time : '未记'}</strong>
          <span className="life-stat-hint">{sleep.main ? clockLabel(sleep.main.startedAt, date).split(' ')[0] : '填写起止时间后显示'}</span>
        </button>
        <button className="life-stat bg-sky/45 text-left" onClick={editSleep} aria-label="查看或补记醒来时间">
          <span className="life-stat-label"><Sunrise size={15} /> 醒来时间</span>
          <strong className="life-stat-value">{sleep.main ? localDateTime(sleep.main.endedAt).time : sleep.legacyWakeTime ?? '未记'}</strong>
          <span className="life-stat-hint">{sleep.main ? '今天' : sleep.legacyWakeTime ? '来自已有每日记录' : '慢慢记，不用补齐'}</span>
        </button>
        <Link to="/journal" className="life-stat bg-peach/50 block">
          <span className="life-stat-label"><Star size={15} /> 今日自评分</span>
          <strong className="life-stat-value">{log?.dayRating != null ? <>{log.dayRating}<span className="text-sm font-normal text-muted"> / 10</span></> : '未记'}</strong>
          <span className="life-stat-hint">{log?.dayRating != null ? '你的感受，由你定义' : '记录今天的感受 →'}</span>
        </Link>
      </div>
      {sleep.entries.length > 1 && <p className="text-xs text-muted mt-3">共 {sleep.entries.length} 段睡眠，时长合计；起止显示最长一段，可在下方展开修改。</p>}
      <div className="mt-5">
        <div className="flex justify-between items-center text-xs mb-2"><span className="text-zinc-600">作息时间轴</span><span className="text-muted flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-[#cbbce9]" /> 睡眠</span></div>
        <div role="img" aria-label={timeline.bands.length ? `睡眠时间轴：${timeline.bands.map((band) => band.label).join('，')}` : '睡眠时间轴：尚未记录起止时间'} className="relative rounded-lg bg-ink-700 h-7 overflow-hidden">
          {timeline.bands.map((band) => <span key={band.id} title={band.label} className="absolute inset-y-0 rounded-md bg-[#cbbce9]" style={{ left: `${band.left}%`, width: `${band.width}%` }} />)}
          {!timeline.bands.length && <span className="absolute inset-0 flex items-center justify-center text-[11px] text-muted">补记睡眠后显示</span>}
        </div>
        <div className="flex justify-between text-[10px] sm:text-[11px] text-muted mt-1.5"><span>昨天 18:00</span><span>00:00</span><span>06:00</span><span>12:00</span><span>今天 18:00</span></div>
      </div>
    </section>

    <section className="card-pad">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-zinc-800">今日时间分布</h2><p className="text-xs text-muted mt-1">已记录 {formatDuration(allocation.recordedMinutes)} · 当天 00:00–24:00</p></div><button className="btn-ghost shrink-0 text-xs sm:text-sm" onClick={() => setEditor('activity')}><Plus size={14} /> 记一段活动</button></div>
      <div role="img" aria-label={`当日各类时长：${allocation.parts.filter((part) => part.minutes > 0).map((part) => `${part.label}${formatDuration(part.minutes)}`).join('，')}`} className="flex h-9 sm:h-10 rounded-xl overflow-hidden mt-5">
        {allocation.parts.filter((part) => part.minutes > 0).map((part) => <div key={part.category} title={`${part.label} ${formatDuration(part.minutes)}`} style={{ width: `${part.minutes / allocation.dayMinutes * 100}%`, backgroundColor: part.color }} />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3 mt-4">
        {allocation.parts.filter((part) => part.category !== 'conflict' || part.minutes > 0).map((part) => <div key={part.category} className="flex items-center justify-between gap-1 text-xs"><span className="flex items-center gap-2 text-zinc-600"><i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: part.color }} />{part.label}</span><span className="text-zinc-800 tabular-nums">{formatDuration(part.minutes)}</span></div>)}
      </div>
      <p className="text-[11px] leading-relaxed text-muted mt-4">按你填写的时段汇总，灰色包含尚未记录和还没到的时间。跨午夜按当天部分计算；不从日记文字或任务时长推算。{dayHours !== 24 && `今天因时区夏令时共 ${dayHours} 小时。`}</p>
      {allocation.totals.conflict > 0 && <p role="alert" className="text-xs text-danger mt-2">有重叠记录，已单独计为「重叠待核对」，请展开下方记录检查。</p>}
      <details className="mt-3 border-t border-line pt-3"><summary className="cursor-pointer text-xs text-accent">查看 / 修改时段记录</summary><div className="mt-3"><TimeRecordList date={date} /><button className="btn-ghost text-xs mt-2" onClick={() => setEditor('sleep')}><Plus size={13} /> 另记一段睡眠 / 午睡</button></div></details>
    </section>

    <div className="grid lg:grid-cols-2 gap-4">
      <section className="card-pad min-w-0">
        <div className="flex justify-between items-baseline gap-2"><h2 className="text-base font-semibold text-zinc-800">近 7 天睡眠</h2><span className="text-xs text-muted">均值 <strong className="text-accent-dim font-medium">{formatDuration(average)}</strong></span></div>
        <div className="mt-5 flex gap-1.5 sm:gap-3" role="img" aria-label={`近7天睡眠：${week.map((day) => `${day.date} ${formatDuration(day.minutes)}`).join('，')}；有记录${knownDays.length}天，均值${formatDuration(average)}`}>
          {week.map((day, index) => <div key={day.date} className="flex-1 min-w-0 text-center">
            <div className="text-[10px] text-zinc-600 h-5 tabular-nums">{day.minutes === null ? '未记' : formatDuration(day.minutes, true)}</div>
            <div className="h-24 flex items-end justify-center border-b border-line pb-0.5">
              {day.minutes === null ? <div className="w-full max-w-8 h-1/4 border border-dashed border-line-strong rounded-t-md" /> : <div className={`w-full max-w-8 rounded-t-md ${index === 6 ? 'bg-accent/70' : 'bg-[#cbbce9]/70'}`} style={{ height: `${Math.max(2, day.minutes / max * 100)}%` }} />}
            </div>
            <div className={`text-[10px] mt-2 ${index === 6 ? 'text-accent-dim font-semibold' : 'text-muted'}`}>{index === 6 ? '今天' : day.date.slice(5).replace('-', '/')}</div>
          </div>)}
        </div>
        <p className="text-[11px] text-muted mt-4">{knownDays.length}/7 天有记录，未记不计入均值。按醒来日合计，优先用时段，其次用旧版自报时长。</p>
      </section>
      <section className="card-pad min-w-0">
        <div className="flex justify-between items-center mb-4"><h2 className="text-base font-semibold text-zinc-800">今天的记录</h2><Link to="/journal" className="text-xs text-accent underline underline-offset-4">{log ? '修改' : '去记录'} →</Link></div>
        <div className="space-y-3">
          <NoteRow icon={<Utensils size={14} />} label="饮食" value={log?.meals} />
          <NoteRow icon={<NotebookPen size={14} />} label="做了什么" value={log?.whatHappened} />
          <NoteRow icon={<Footprints size={14} />} label="运动" value={exercise > 0 ? `已记 ${formatDuration(exercise)}${log?.exerciseNote ? ` · ${log.exerciseNote}` : ''}` : log?.exerciseNote || (log?.exerciseDone === true ? '运动了' : log?.exerciseDone === false ? '没有运动' : undefined)} />
          <NoteRow icon={<Cloud size={14} />} label="不顺心的事" value={log?.biggestDifficulty} />
        </div>
        <p className="text-[11px] text-muted mt-4">和「每日记录」是同一份内容，随时可以补充。</p>
      </section>
    </div>
    {editor && <TimeEntryEditor date={date} sleep={editor === 'sleep'} entry={typeof editor === 'object' ? editor : undefined} onClose={() => setEditor(null)} />}
  </div>
}

function NoteRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return <div className="flex gap-2.5 text-xs"><span className="text-muted mt-0.5 shrink-0">{icon}</span><div className="min-w-0"><div className="text-muted mb-0.5">{label}</div><p className={`whitespace-pre-wrap break-words line-clamp-2 ${value ? 'text-zinc-700' : 'text-muted'}`}>{value || '还没记录'}</p></div></div>
}
