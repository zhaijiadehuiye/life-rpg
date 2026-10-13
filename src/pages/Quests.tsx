import { useState } from 'react'
import { Check, Plus, Trash2, Dices, Pencil, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { AddQuestModal, type EditingQuest } from '../components/AddQuestModal'
import { todayKey, formatChineseDate } from '../utils/date'

export default function Quests() {
  const s = useGameStore()
  const [showAdd, setShowAdd] = useState(false)
  const [showIdeas, setShowIdeas] = useState(false)
  const [editing, setEditing] = useState<EditingQuest | null>(null)
  const today = todayKey()

  const remove = (kind: 'main' | 'daily' | 'side', id: string, title: string) => {
    if (window.confirm(`要删除「${title}」吗？它会从计划中移除，且无法恢复。已经获得的经验不会改变。`)) {
      s.deleteQuest(kind, id)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-800">计划与目标</h1>
            <p className="text-sm text-muted mt-1">把想做的事放在这里。没做完可以继续留着，不会扣经验。</p>
          </div>
          <button className="btn-primary shrink-0" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> 添加计划
          </button>
        </div>
        <div className="card p-3.5 flex items-start gap-2.5 text-sm text-muted">
          <BookOpen size={16} className="text-accent mt-0.5 shrink-0" />
          <p>不知道从哪开始？先建一个「一次性事项」即可。<Link className="text-accent underline underline-offset-2" to="/guide">查看 2 分钟使用说明</Link></p>
        </div>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-zinc-800">长期目标</h2>
        <p className="text-xs text-muted mt-1 mb-2">需要一段时间完成的事，可以拆成阶段。每完成一个阶段会获得 30 XP。</p>
        <div className="space-y-3">
          {s.mainQuests.length === 0 && <Empty text="还没有长期目标。比如：完成一个作品、准备一次转行。" />}
          {s.mainQuests.map((m) => (
            <div key={m.id} className="card-pad">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base text-zinc-800 flex flex-wrap items-center gap-2">
                    {m.title}
                    {m.status === 'completed' && <span className="chip text-good border-good/30">已完成</span>}
                  </div>
                  {m.description && <div className="text-sm text-muted mt-1">{m.description}</div>}
                  <div className="text-[11px] text-muted mt-1">
                    开始于 {formatChineseDate(m.startDate)}
                    {m.targetDate ? ` · 目标日期 ${formatChineseDate(m.targetDate)}` : ''}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button aria-label={`编辑长期目标：${m.title}`} title="编辑" onClick={() => setEditing({
                    kind: 'main', id: m.id, title: m.title, description: m.description,
                    domain: m.domain, targetDate: m.targetDate ?? '',
                    milestones: m.milestones.map((x) => x.title),
                  })} className="text-muted hover:text-accent p-1">
                    <Pencil size={15} />
                  </button>
                  <button aria-label={`删除长期目标：${m.title}`} title="删除" onClick={() => remove('main', m.id, m.title)} className="text-muted hover:text-danger p-1">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {m.milestones.length > 0 ? (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {m.milestones.map((mi) => (
                    <label key={mi.id} className="flex items-start gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={mi.completed} onChange={() => s.toggleMilestone(m.id, mi.id)} className="accent-accent w-4 h-4 mt-0.5" />
                      <span className={mi.completed ? 'line-through text-muted' : 'text-zinc-700'}>{mi.title}</span>
                    </label>
                  ))}
                </div>
              ) : <p className="text-xs text-muted mt-3 border-t border-line pt-3">还没有阶段。编辑目标即可添加，每行写一个阶段。</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-800">固定习惯</h2>
        <p className="text-xs text-muted mt-1 mb-2">每天都可以完成一次；今天完成后明天会重新开放。</p>
        <div className="space-y-2">
          {s.dailyQuests.length === 0 && <Empty text="没有固定习惯也完全可以。需要时再添加一项小事。" />}
          {s.dailyQuests.map((q) => {
            const done = q.lastCompletedDate === today
            return (
              <div key={q.id} className="card p-3 flex items-center gap-3">
                <button aria-label={`${done ? '今日已完成' : '完成习惯'}：${q.title}`} onClick={() => s.completeDailyQuest(q.id)} disabled={done}
                  className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${done ? 'bg-accent border-accent text-ink-950' : 'border-line text-transparent hover:border-accent'}`}>
                  <Check size={14} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${done ? 'line-through text-muted' : 'text-zinc-800'}`}>{q.title}</div>
                  {q.description && <div className="text-xs text-muted mt-0.5">{q.description}</div>}
                  <div className="text-[11px] text-muted mt-0.5">完成得 +{q.xpReward} XP{done ? ' · 今天已完成' : ''}</div>
                </div>
                <button aria-label={`编辑固定习惯：${q.title}`} title="编辑" onClick={() => setEditing({
                  kind: 'daily', id: q.id, title: q.title, description: q.description,
                  difficulty: q.difficulty, capitalKey: q.capitalKey, skillId: q.skillId, minutes: q.minutes, xpReward: q.xpReward,
                })} className="text-muted hover:text-accent p-1"><Pencil size={14} /></button>
                <button aria-label={`删除固定习惯：${q.title}`} title="删除" onClick={() => remove('daily', q.id, q.title)} className="text-muted hover:text-danger p-1"><Trash2 size={14} /></button>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-800">一次性事项</h2>
        <p className="text-xs text-muted mt-1 mb-2">只需要完成一次的事。完成后经验只发放一次。</p>
        <div className="space-y-2">
          {s.sideQuests.length === 0 && <Empty text="例如：预约体检、给朋友回电话、提交一份申请。" />}
          {s.sideQuests.map((q) => (
            <div key={q.id} className="card p-3 flex items-center gap-3">
              <button aria-label={`${q.completed ? '已完成' : '完成事项'}：${q.title}`} onClick={() => s.completeSideQuest(q.id)} disabled={q.completed}
                className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${q.completed ? 'bg-accent border-accent text-ink-950' : 'border-line text-transparent hover:border-accent'}`}>
                <Check size={14} />
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${q.completed ? 'line-through text-muted' : 'text-zinc-800'}`}>{q.title}</div>
                {q.description && <div className="text-xs text-muted mt-0.5">{q.description}</div>}
                <div className="text-[11px] text-muted mt-0.5">完成得 +{q.xpReward} XP{q.minutes ? ` · 预计 ${q.minutes} 分钟` : ''}{q.completed ? ' · 已完成' : ''}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {!q.completed && <button aria-label={`编辑事项：${q.title}`} title="编辑" onClick={() => setEditing({
                  kind: 'side', id: q.id, title: q.title, description: q.description,
                  difficulty: q.difficulty, capitalKey: q.capitalKey, skillId: q.skillId, minutes: q.minutes, xpReward: q.xpReward,
                })} className="text-muted hover:text-accent p-1"><Pencil size={14} /></button>}
                <button aria-label={`删除事项：${q.title}`} title="删除" onClick={() => remove('side', q.id, q.title)} className="text-muted hover:text-danger p-1"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-3.5">
        <button className="flex w-full items-center gap-2 text-sm font-medium text-zinc-800" onClick={() => setShowIdeas((open) => !open)} aria-expanded={showIdeas}>
          <Dices size={16} className="text-accent" /> {showIdeas ? '收起灵感卡片' : '随机灵感（可选）'}
        </button>
        {showIdeas && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted">这里只是给自己找点子，不会自动加入计划，也不会产生经验。</p>
            <button className="btn" onClick={s.newRandomEvent}><Dices size={14} /> 换一个灵感</button>
            {s.randomEvents.length === 0 && <p className="text-xs text-muted">点击上方按钮生成一张灵感卡片。</p>}
            {s.randomEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-line p-3">
                <div className="text-sm text-zinc-800">{event.title}</div>
                <div className="text-xs text-muted mt-0.5">{event.description}</div>
                {event.status === 'pending' ? (
                  <div className="flex gap-2 mt-2">
                    <button className="btn-primary text-xs" onClick={() => s.acceptEvent(event.id)}>留作灵感</button>
                    <button className="btn text-xs" onClick={() => s.ignoreEvent(event.id)}>忽略</button>
                  </div>
                ) : <div className="text-[11px] text-muted mt-2">{event.status === 'accepted' ? '已留作灵感；如要执行，请自行添加到计划。' : event.status === 'ignored' ? '已忽略。' : '已完成。'}</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      <AddQuestModal open={showAdd} onClose={() => setShowAdd(false)} />
      <AddQuestModal open={!!editing} onClose={() => setEditing(null)} editing={editing} />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="card-pad text-sm text-muted text-center">{text}</div>
}
