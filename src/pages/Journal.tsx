import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { todayKey, dateKeyFromTimestamp, formatChineseDate } from '../utils/date'
import type { DailyLog } from '../types'

type JournalDraft = Pick<DailyLog,
  'whatHappened' | 'bestThing' | 'biggestDifficulty' | 'didRight' | 'tomorrowPriority' |
  'dayRating' | 'wakeTime' | 'meals' | 'exerciseDone' | 'exerciseNote'
>

const EXERCISE_CHOICES: { label: string; value: boolean | null }[] = [
  { label: '还没记录', value: null },
  { label: '运动了', value: true },
  { label: '没有运动', value: false },
]

export default function Journal() {
  const s = useGameStore()
  const today = todayKey()
  const existing = s.logs.find((l) => l.date === today)
  const [form, setForm] = useState<JournalDraft>(() => ({
    whatHappened: existing?.whatHappened ?? '',
    bestThing: existing?.bestThing ?? '',
    biggestDifficulty: existing?.biggestDifficulty ?? '',
    didRight: existing?.didRight ?? '',
    tomorrowPriority: existing?.tomorrowPriority ?? '',
    dayRating: existing?.dayRating ?? null,
    wakeTime: existing?.wakeTime ?? '',
    meals: existing?.meals ?? '',
    exerciseDone: existing?.exerciseDone ?? null,
    exerciseNote: existing?.exerciseNote ?? '',
  }))

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
      <header>
        <h1 className="text-xl font-semibold text-zinc-800">每日记录</h1>
        <p className="text-sm text-muted mt-1">记下你在意的日常：几点醒、吃了什么、做了什么、是否运动，以及今天的感受。每项都可跳过，之后可以回来补充或修改。</p>
        <p className="text-sm text-muted mt-1">这里的文字只保存在 Life RPG 本地存档，不会自动分析或覆盖原文。需要多条原始记录和修订历史时，使用 <Link to="/historian" className="text-accent underline underline-offset-2">自我历史学</Link>。</p>
      </header>

      <section className="card-pad space-y-5">
        <div>
          <h2 className="label">今天 · {formatChineseDate(today)}</h2>
          <p className="text-xs text-muted mt-1">每天一条记录；再次保存会更新今天的内容，不保留修订历史。</p>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-zinc-700">今天给自己打几分？ <span className="text-xs text-muted font-normal">（1–10 分，可跳过）</span></legend>
          <div role="group" aria-label="今日自评分" className="grid grid-cols-5 sm:grid-cols-10 gap-2 mt-2">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
              <button key={score} type="button" aria-pressed={form.dayRating === score}
                onClick={() => setForm((value) => ({ ...value, dayRating: score }))}
                className={`h-10 rounded-lg border text-sm font-medium ${form.dayRating === score ? 'border-accent bg-mint text-accent-dim' : 'border-line text-zinc-600 hover:border-accent'}`}>
                {score}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-muted mt-1"><span>不太顺的一天</span><span>很满意的一天</span></div>
          {form.dayRating != null && <button type="button" className="text-xs text-accent underline underline-offset-2 mt-2" onClick={() => setForm((value) => ({ ...value, dayRating: null }))}>清除评分</button>}
        </fieldset>

        <label className="block max-w-xs">
          <span className="text-sm text-zinc-700">大约几点醒来？ <span className="text-xs text-muted">（可选）</span></span>
          <input aria-label="醒来时间" className="input mt-1.5" type="time" value={form.wakeTime ?? ''}
            onChange={(event) => setForm((value) => ({ ...value, wakeTime: event.target.value }))} />
        </label>

        <TextField label="今天吃了什么？" placeholder="例如：早餐吃了……，晚饭……" value={form.meals ?? ''}
          onChange={(meals) => setForm((value) => ({ ...value, meals }))} />
        <TextField label="今天做了哪些事？" placeholder="工作、学习、休息、见了谁……按你记得的写" value={form.whatHappened}
          onChange={(whatHappened) => setForm((value) => ({ ...value, whatHappened }))} />
        <TextField label="今天不顺心或不太好的事？" placeholder="可以只写事实，不用评价自己" value={form.biggestDifficulty}
          onChange={(biggestDifficulty) => setForm((value) => ({ ...value, biggestDifficulty }))} />

        <fieldset>
          <legend className="text-sm text-zinc-700">今天运动了吗？ <span className="text-xs text-muted">（可选）</span></legend>
          <div role="group" aria-label="今天运动了吗？" className="grid grid-cols-3 gap-2 mt-2">
            {EXERCISE_CHOICES.map((choice) => (
              <button key={choice.label} type="button" aria-pressed={form.exerciseDone === choice.value}
                onClick={() => setForm((value) => ({ ...value, exerciseDone: choice.value }))}
                className={`rounded-lg border px-2 py-2.5 text-xs sm:text-sm ${form.exerciseDone === choice.value ? 'border-accent bg-mint text-accent-dim' : 'border-line text-zinc-600 hover:border-accent'}`}>
                {choice.label}
              </button>
            ))}
          </div>
          <textarea aria-label="运动补充" className="input mt-2" rows={2} placeholder="运动内容或时长（可选）" value={form.exerciseNote ?? ''}
            onChange={(event) => setForm((value) => ({ ...value, exerciseNote: event.target.value }))} />
          <p className="text-[11px] text-muted mt-1">这只是记录，不运动或留空都不会扣分、扣经验。</p>
        </fieldset>

        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700">补充回顾（全部选填）</summary>
          <div className="space-y-3 mt-3">
            <TextField label="今天值得记住的一件事" placeholder="哪怕很小……" value={form.bestThing}
              onChange={(bestThing) => setForm((value) => ({ ...value, bestThing }))} />
            <TextField label="今天做得不错的地方" placeholder="例如：及时休息、完成了一小步……" value={form.didRight}
              onChange={(didRight) => setForm((value) => ({ ...value, didRight }))} />
            <TextField label="明天想优先做什么" placeholder="只写一件也可以" value={form.tomorrowPriority}
              onChange={(tomorrowPriority) => setForm((value) => ({ ...value, tomorrowPriority }))} />
          </div>
        </details>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button className="btn-primary" onClick={save}>{existing ? '保存今天的修改' : '保存今天的记录'}</button>
          <span className="text-xs text-muted">保存后会留在本机浏览器，可随时更新。</span>
        </div>
      </section>

      <section>
        <h2 className="label mb-2">过去的每日记录</h2>
        <div className="space-y-2">
          {s.logs.length === 0 && <div className="card-pad text-sm text-muted text-center">还没有历史日志。</div>}
          {s.logs.map((log) => (
            <details key={log.date} className="card p-3 group">
              <summary className="flex justify-between items-center cursor-pointer list-none gap-3">
                <div className="text-sm text-zinc-800">{formatChineseDate(log.date)}</div>
                <div className="text-right">
                  {log.dayRating != null && <div className="text-sm font-semibold text-accent-dim">{log.dayRating}/10 分</div>}
                  <div className="text-[11px] text-muted font-mono">{log.tasksCompleted ?? 0} 项 · +{log.xpEarned ?? 0} XP</div>
                </div>
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                {log.wakeTime && <Row label="醒来时间" value={log.wakeTime} />}
                {log.meals && <Row label="饮食" value={log.meals} />}
                {log.whatHappened && <Row label="今天做了什么" value={log.whatHappened} />}
                {log.biggestDifficulty && <Row label="不顺心的事或困难" value={log.biggestDifficulty} />}
                {typeof log.exerciseDone === 'boolean' && <Row label="运动" value={log.exerciseDone ? '运动了' : '没有运动'} />}
                {log.exerciseNote && <Row label="运动补充" value={log.exerciseNote} />}
                {log.bestThing && <Row label="值得记住" value={log.bestThing} />}
                {log.didRight && <Row label="做得不错" value={log.didRight} />}
                {log.tomorrowPriority && <Row label="明天重点" value={log.tomorrowPriority} />}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function TextField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-zinc-700">{label} <span className="text-xs text-muted">（可选）</span></span>
      <textarea className="input mt-1.5" rows={3} placeholder={placeholder} value={value}
        onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-zinc-700 whitespace-pre-wrap">{value}</div>
    </div>
  )
}
