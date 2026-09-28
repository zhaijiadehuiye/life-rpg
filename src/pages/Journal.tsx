import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { todayKey, dateKeyFromTimestamp, formatChineseDate } from '../utils/date'

const FIELDS = [
  { key: 'whatHappened', label: '今天发生了什么？', placeholder: '几句话记录今天…' },
  { key: 'bestThing', label: '今天最值得记录的事？', placeholder: '哪怕很小…' },
  { key: 'biggestDifficulty', label: '今天最大的困难？', placeholder: '不评判，只观察…' },
  { key: 'didRight', label: '今天做对了什么？', placeholder: '…' },
  { key: 'tomorrowPriority', label: '明天最重要的一件事？', placeholder: '只写一件…' },
] as const

export default function Journal() {
  const s = useGameStore()
  const today = todayKey()
  const existing = s.logs.find((l) => l.date === today)
  const [form, setForm] = useState({
    whatHappened: existing?.whatHappened ?? '',
    bestThing: existing?.bestThing ?? '',
    biggestDifficulty: existing?.biggestDifficulty ?? '',
    didRight: existing?.didRight ?? '',
    tomorrowPriority: existing?.tomorrowPriority ?? '',
  })

  const save = () => {
    const doneToday =
      s.dailyQuests.filter((d) => d.lastCompletedDate === today).length +
      s.sideQuests.filter((q) => q.completedAt === today).length
    const xpToday = s.transactions
      .filter((t) => dateKeyFromTimestamp(t.timestamp) === today && t.kind === 'character')
      .reduce((a, t) => a + t.amount, 0)
    s.writeLog({ ...form, tasksCompleted: doneToday, xpEarned: xpToday })
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-zinc-800">人生时间线</h1>
      <section className="card-pad">
        <h2 className="label mb-3">今天 · {formatChineseDate(today)}</h2>
        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <div className="text-sm text-zinc-700 mb-1">{f.label}</div>
              <textarea className="input" rows={2} placeholder={f.placeholder} value={form[f.key]}
                onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <button className="btn-primary mt-4" onClick={save}>保存今日记录</button>
      </section>

      <section>
        <h2 className="label mb-2">历史</h2>
        <div className="space-y-2">
          {s.logs.length === 0 && <div className="card-pad text-sm text-muted text-center">还没有历史日志。</div>}
          {s.logs.map((l) => (
            <details key={l.date} className="card p-3 group">
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <div className="text-sm text-zinc-800">{formatChineseDate(l.date)}</div>
                <div className="text-[11px] text-muted font-mono">{l.tasksCompleted} 任务 · +{l.xpEarned} XP</div>
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                {l.whatHappened && <Row label="发生了什么" value={l.whatHappened} />}
                {l.bestThing && <Row label="值得记录" value={l.bestThing} />}
                {l.biggestDifficulty && <Row label="困难" value={l.biggestDifficulty} />}
                {l.didRight && <Row label="做对了" value={l.didRight} />}
                {l.tomorrowPriority && <Row label="明天重点" value={l.tomorrowPriority} />}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-zinc-700">{value}</div>
    </div>
  )
}
