import { useState } from 'react'
import { Modal } from '../Modal'
import { useResearch } from '../../lib/useResearch'
import { EmptyResearch, ResearchField, ResearchForm } from '../ResearchUI'
import { fieldNumber, fieldText, researchDate, researchId, statusLabel } from '../../lib/research'
import { addDays, todayKey } from '../../utils/date'
import { useGameStore } from '../../store/useGameStore'
import { sleepForDate } from '../../lib/dailyTime'

export function Experiments() {
  const { state, commit } = useResearch()
  const [open, setOpen] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  return <div className="space-y-4"><div className="flex flex-wrap justify-between items-center gap-3"><p className="text-sm text-muted max-w-xl">一次只试一个小改变，留下观察。漏记或中途暂停都没关系，不会扣经验。</p><button className="btn-primary" onClick={() => setOpen('new')}>开始一个小实验</button></div>
    {message && <p role="status" className="text-sm text-accent-dim">{message}</p>}{error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {!state!.experiments.length ? <EmptyResearch>例如：试一周把手机放远一点，观察自己是否更容易开始读书。</EmptyResearch> : state!.experiments.map((row) => <article key={row.id} className="card-pad space-y-3"><div className="flex items-start justify-between gap-3"><h2 className="text-base font-semibold">{row.title}</h2><span className="chip shrink-0">{statusLabel(row.status)}</span></div><p className="text-sm text-muted whitespace-pre-wrap break-words">{row.question}</p><p className="text-xs text-muted">{researchDate(row.startDate)} — {researchDate(row.endDate)} · {row.observations?.length ?? 0} 次观察{row.metrics?.length ? ` · ${row.metrics.join('、')}` : ''}</p>
      {row.conclusion && <div className="rounded-xl bg-mint/40 p-3 text-sm whitespace-pre-wrap break-words">{row.conclusion}</div>}
      <div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => setOpen(row.id)}>记录一次观察</button><button className="btn-ghost" disabled={!row.observations?.length} onClick={async () => {
        setError(''); setMessage('')
        try { await commit((draft) => {
          const item = draft.experiments.find((item) => item.id === row.id)
          if (!item?.observations.length) throw new Error('先记录一次观察，再整理小结。')
          const values = item.observations.map((value) => value.focus).filter((value) => Number.isFinite(value))
          const conclusion = `已记录 ${item.observations.length} 次观察，其中完成尝试 ${item.observations.filter((value) => value.completed).length} 次${values.length ? `，平均专注 ${((values.reduce((a, b) => a + b, 0)) / values.length).toFixed(1)}/5` : ''}。这是已有观察的汇总，还不能据此得出因果结论。`
          const history = Array.isArray(item.conclusionHistory) ? item.conclusionHistory : item.conclusion ? [{ text: item.conclusion, createdAt: item.createdAt }] : []
          item.conclusionHistory = [...history, { text: conclusion, createdAt: new Date().toISOString() }]; item.conclusion = conclusion
        }); setMessage('已整理观察，小结和原有记录均保留。') } catch (error) { setError(error instanceof Error ? error.message : '未能保存，请重试。') }
      }}>整理当前观察</button></div>
      <details><summary className="text-xs text-accent cursor-pointer">查看全部观察</summary><div className="space-y-3 mt-3">{(row.observations ?? []).map((value) => <div key={value.id} className="border-l-2 border-line pl-3 text-xs"><div className="text-zinc-700">{researchDate(value.date)} · {value.completed ? '完成了尝试' : '这次没有完成'} · 专注 {value.focus}/5 · 抗拒 {value.resistance}/5{value.sleepHours != null ? ` · 睡眠 ${value.sleepHours}h` : ''}</div><p className="mt-1 text-muted whitespace-pre-wrap break-words">{value.note}</p></div>)}{!row.observations?.length && <p className="text-xs text-muted">还没有观察，想起来时再记即可。</p>}{Array.isArray(row.conclusionHistory) && row.conclusionHistory.map((item, index) => <p key={index} className="text-xs text-muted whitespace-pre-wrap">{typeof item === 'object' && item && 'text' in item ? String(item.text) : ''}</p>)}</div></details>
    </article>)}
    {open === 'new' && <Modal open title="开始一个小实验" onClose={() => setOpen(null)}><ResearchForm label="保存实验" onSuccess={() => setOpen(null)} onSave={async (data) => {
      const title = fieldText(data, 'title'), question = fieldText(data, 'question'), durationDays = fieldNumber(data, 'days', 2, 30)
      if (!title || !question || !Number.isInteger(durationDays)) throw new Error('请填写标题、问题和 2–30 天的整数时长。')
      await commit((draft) => draft.experiments.unshift({ id: researchId('X'), title, question, durationDays, startDate: todayKey(), endDate: addDays(todayKey(), durationDays - 1), status: 'Active', observations: [], conclusion: '', metrics: fieldText(data, 'metrics').split(/[,，、]+/).map((text) => text.trim()).filter(Boolean), createdAt: new Date().toISOString() }))
    }}><ResearchField label="这次想尝试什么？"><input className="input" name="title" required placeholder="例如：读书前把手机放在另一个房间" /></ResearchField><ResearchField label="想弄明白的问题"><textarea className="input" name="question" rows={3} required placeholder="例如：这样能让我更容易开始吗？" /></ResearchField><ResearchField label="打算观察几天（2–30）"><input className="input" name="days" type="number" min={2} max={30} defaultValue={7} required /></ResearchField><ResearchField label="关注哪些变化？（可选）"><input className="input" name="metrics" placeholder="例如：专注、心情、开始难度" /></ResearchField></ResearchForm></Modal>}
    {open && open !== 'new' && <ObservationForm id={open} onClose={() => setOpen(null)} />}
  </div>
}

function ObservationForm({ id, onClose }: { id: string; onClose: () => void }) {
  const { commit } = useResearch()
  const game = useGameStore()
  const [date, setDate] = useState(todayKey())
  const sleep = sleepForDate(game, date)
  return <Modal open title="记一次观察" onClose={onClose}><ResearchForm label="保存观察" onSuccess={onClose} onSave={async (data) => {
    const focus = fieldNumber(data, 'focus', 1, 5), resistance = fieldNumber(data, 'resistance', 1, 5), sleepText = fieldText(data, 'sleep')
    const sleepHours = sleepText ? fieldNumber(data, 'sleep', 0, 24) : null
    if (date > todayKey()) throw new Error('观察日期不能晚于今天。')
    await commit((draft) => { const row = draft.experiments.find((row) => row.id === id); if (!row) throw new Error('实验暂不可读取。'); row.observations = [...(row.observations ?? []), { id: researchId('obs'), date, completed: fieldText(data, 'completed') === 'true', focus, resistance, sleepHours, note: fieldText(data, 'note') }].sort((a, b) => a.date.localeCompare(b.date)) })
  }}><ResearchField label="观察日期"><input aria-label="观察日期" className="input" type="date" required max={todayKey()} value={date} onChange={(event) => setDate(event.target.value)} /></ResearchField><ResearchField label="这次完成尝试了吗？"><select className="input" name="completed"><option value="true">完成了</option><option value="false">没有完成，只记下观察</option></select></ResearchField><div className="grid grid-cols-2 gap-3"><ResearchField label="专注程度（1–5）"><input className="input" name="focus" type="number" min={1} max={5} defaultValue={3} required /></ResearchField><ResearchField label="抗拒程度（1–5）"><input className="input" name="resistance" type="number" min={1} max={5} defaultValue={3} required /></ResearchField></div><ResearchField label="当天睡眠时长（可选）" hint={sleep.minutes !== null ? '已从生活记录带入，可按本次观察调整；不会改写原睡眠记录。' : '不知道可以留空，不当作 0 小时。'}><input key={date} className="input" name="sleep" type="number" min={0} max={24} step="any" defaultValue={sleep.minutes !== null ? Number((sleep.minutes / 60).toFixed(2)) : ''} /></ResearchField><ResearchField label="实际发生了什么？（可选）"><textarea className="input" name="note" rows={3} /></ResearchField></ResearchForm></Modal>
}
