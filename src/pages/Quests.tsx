import { useState } from 'react'
import { Check, Plus, Trash2, Dices, Pencil } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { AddQuestModal, type EditingQuest } from '../components/AddQuestModal'
import { todayKey, formatChineseDate } from '../utils/date'

export default function Quests() {
  const s = useGameStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<EditingQuest | null>(null)
  const today = todayKey()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">任务</h1>
        <div className="flex gap-2">
          <button className="btn" onClick={s.newRandomEvent}>
            <Dices size={14} /> 随机事件
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> 新建
          </button>
        </div>
      </div>

      <section>
        <h2 className="label mb-2">主线任务 · 人生阶段目标</h2>
        <div className="space-y-3">
          {s.mainQuests.length === 0 && <Empty text="还没有主线。创建一条，把它拆成阶段。" />}
          {s.mainQuests.map((m) => (
            <div key={m.id} className="card-pad">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base text-zinc-100 flex items-center gap-2">
                    {m.title}
                    {m.status === 'completed' && <span className="chip text-good border-good/30">已完成</span>}
                  </div>
                  <div className="text-xs text-muted mt-1">{m.description}</div>
                  <div className="text-[11px] text-muted mt-1">
                    始于 {formatChineseDate(m.startDate)}
                    {m.targetDate ? ` · 目标 ${formatChineseDate(m.targetDate)}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing({
                    kind: 'main', id: m.id, title: m.title, description: m.description,
                    domain: m.domain, targetDate: m.targetDate ?? '',
                    milestones: m.milestones.map((x) => x.title),
                  })} className="text-muted hover:text-accent">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => s.deleteQuest('main', m.id)} className="text-muted hover:text-danger">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {m.milestones.map((mi) => (
                  <label key={mi.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={mi.completed} onChange={() => s.toggleMilestone(m.id, mi.id)}
                      className="accent-accent w-4 h-4" />
                    <span className={mi.completed ? 'line-through text-muted' : 'text-zinc-200'}>{mi.title}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="label mb-2">日常任务 · 每天只奖一次 XP</h2>
        <div className="space-y-2">
          {s.dailyQuests.length === 0 && <Empty text="还没有日常。建议加 3-5 个最小习惯。" />}
          {s.dailyQuests.map((q) => {
            const done = q.lastCompletedDate === today
            return (
              <div key={q.id} className="card p-3 flex items-center gap-3">
                <button onClick={() => s.completeDailyQuest(q.id)} disabled={done}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center ${done ? 'bg-accent border-accent text-ink-950' : 'border-line text-transparent hover:border-accent'}`}>
                  <Check size={14} />
                </button>
                <div className="flex-1">
                  <div className={`text-sm ${done ? 'line-through text-muted' : 'text-zinc-100'}`}>{q.title}</div>
                  <div className="text-[11px] text-muted">+{q.xpReward} XP{done ? ' · 今日已完成' : ''}</div>
                </div>
                <button onClick={() => setEditing({
                  kind: 'daily', id: q.id, title: q.title, description: q.description,
                  difficulty: q.difficulty, capitalKey: q.capitalKey, skillId: q.skillId, minutes: q.minutes,
                })} className="text-muted hover:text-accent"><Pencil size={14} /></button>
                <button onClick={() => s.deleteQuest('daily', q.id)} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="label mb-2">支线任务</h2>
        <div className="space-y-2">
          {s.sideQuests.length === 0 && <Empty text="还没有支线。" />}
          {s.sideQuests.map((q) => (
            <div key={q.id} className="card p-3 flex items-center gap-3">
              <button onClick={() => s.completeSideQuest(q.id)} disabled={q.completed}
                className={`w-6 h-6 rounded-md border flex items-center justify-center ${q.completed ? 'bg-accent border-accent text-ink-950' : 'border-line text-transparent hover:border-accent'}`}>
                <Check size={14} />
              </button>
              <div className="flex-1">
                <div className={`text-sm ${q.completed ? 'line-through text-muted' : 'text-zinc-100'}`}>{q.title}</div>
                <div className="text-[11px] text-muted">+{q.xpReward} XP{q.minutes ? ` · ${q.minutes} 分钟` : ''}</div>
              </div>
              {!q.completed && (
                <button onClick={() => s.skipSideQuest(q.id)} className="text-xs text-muted hover:text-zinc-200">跳过</button>
              )}
              {!q.completed && (
                <button onClick={() => setEditing({
                  kind: 'side', id: q.id, title: q.title, description: q.description,
                  difficulty: q.difficulty, capitalKey: q.capitalKey, skillId: q.skillId, minutes: q.minutes,
                })} className="text-muted hover:text-accent"><Pencil size={14} /></button>
              )}
              <button onClick={() => s.deleteQuest('side', q.id)} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="label mb-2">随机事件</h2>
        <div className="space-y-2">
          {s.randomEvents.length === 0 && <Empty text={'点上方"随机事件"生成一个。'} />}
          {s.randomEvents.map((e) => (
            <div key={e.id} className="card p-3">
              <div className="text-sm text-zinc-100">{e.title}</div>
              <div className="text-xs text-muted mt-0.5">{e.description}</div>
              {e.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button className="btn-primary text-xs" onClick={() => s.acceptEvent(e.id)}>接受</button>
                  <button className="btn text-xs" onClick={() => s.ignoreEvent(e.id)}>忽略</button>
                </div>
              )}
              {e.status !== 'pending' && (
                <div className="text-[11px] text-muted mt-2">
                  {e.status === 'accepted' ? '已接受，去现实里发生它。' : e.status === 'ignored' ? '已忽略。' : '已完成。'}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <AddQuestModal open={showAdd} onClose={() => setShowAdd(false)} />
      <AddQuestModal open={!!editing} onClose={() => setEditing(null)} editing={editing} />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="card-pad text-sm text-muted text-center">{text}</div>
}
