import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { useGameStore } from '../store/useGameStore'
import { CAPITAL_META } from '../data/constants'
import { DIFFICULTY_PRESET } from '../utils/xp'
import type { CapitalKey, Difficulty, SideQuest, DailyQuest } from '../types'

type Mode = 'side' | 'daily' | 'main'

const MODE_COPY: Record<Mode, { title: string; description: string }> = {
  side: { title: '一次性事项', description: '完成一次就结束，例如预约体检。' },
  daily: { title: '固定习惯', description: '每天可以完成一次，例如散步 10 分钟。' },
  main: { title: '长期目标', description: '需要分阶段推进，例如完成一个作品。' },
}

export interface EditingQuest {
  kind: Mode
  id: string
  title: string
  description?: string
  difficulty?: Difficulty
  capitalKey?: CapitalKey
  skillId?: string
  minutes?: number
  xpReward?: number
  domain?: string
  targetDate?: string
  milestones?: string[]
}

export function AddQuestModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing?: EditingQuest | null
}) {
  const s = useGameStore()
  const [mode, setMode] = useState<Mode>('side')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [capitalKey, setCapitalKey] = useState<CapitalKey | ''>('')
  const [skillId, setSkillId] = useState('')
  const [minutes, setMinutes] = useState<number>(30)
  const [milestonesText, setMilestonesText] = useState('')
  const [domain, setDomain] = useState('career')
  const [targetDate, setTargetDate] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setMode(editing.kind)
      setTitle(editing.title)
      setDescription(editing.description ?? '')
      setDifficulty(editing.difficulty ?? 'normal')
      setCapitalKey(editing.capitalKey ?? '')
      setSkillId(editing.skillId ?? '')
      setMinutes(editing.minutes ?? 30)
      setDomain(editing.domain ?? 'career')
      setTargetDate(editing.targetDate ?? '')
      setMilestonesText((editing.milestones ?? []).join('\n'))
    } else {
      setMode('side')
      setTitle('')
      setDescription('')
      setDifficulty('normal')
      setCapitalKey('')
      setSkillId('')
      setMinutes(30)
      setMilestonesText('')
      setDomain('career')
      setTargetDate('')
    }
  }, [open, editing])

  const preset = DIFFICULTY_PRESET[difficulty]
  const xpReward = editing?.difficulty
    ? undefined
    : preset.min + Math.round((preset.max - preset.min) / 2)

  const submit = () => {
    if (!title.trim()) return
    if (editing) {
      const base = {
        title: title.trim(),
        description: description.trim(),
        difficulty,
        capitalKey: capitalKey || undefined,
        skillId: skillId || undefined,
        minutes,
      }
      if (editing.kind === 'side') s.updateSideQuest(editing.id, base as Partial<SideQuest>)
      else if (editing.kind === 'daily') s.updateDailyQuest(editing.id, base as Partial<DailyQuest>)
      else s.updateMainQuest(editing.id, {
        title: title.trim(),
        description: description.trim(),
        domain,
        targetDate: targetDate || undefined,
        milestones: milestonesText.split('\n').map((t) => t.trim()).filter(Boolean),
      })
    } else if (mode === 'side') {
      s.addSideQuest({
        title: title.trim(), description: description.trim(), difficulty,
        xpReward: xpReward!, capitalKey: capitalKey || undefined,
        skillId: skillId || undefined, minutes,
      })
    } else if (mode === 'daily') {
      s.addDailyQuest({
        title: title.trim(), description: description.trim(), difficulty,
        xpReward: xpReward!, capitalKey: capitalKey || undefined,
        skillId: skillId || undefined, minutes,
      })
    } else {
      s.addMainQuest({
        title: title.trim(), description: description.trim(), domain, difficulty,
        targetDate: targetDate || undefined, startDate: new Date().toISOString().slice(0, 10),
        milestones: milestonesText.split('\n').map((t) => t.trim()).filter(Boolean),
      })
    }
    onClose()
  }

  const activeMode = editing ? editing.kind : mode

  return (
    <Modal open={open} onClose={onClose} title={editing ? '编辑计划' : '添加计划'}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {editing ? '修改名称或说明不会影响已经获得的经验。' : '只填名称就能添加，其他内容都可以之后再补。'}
        </p>
        {!editing && (
          <div className="grid gap-2">
            {(['side', 'daily', 'main'] as Mode[]).map((m) => (
              <button type="button" key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`rounded-xl border p-3 text-left transition-colors ${mode === m ? 'border-accent/50 bg-mint/40' : 'border-line hover:border-accent/30'}`}>
                <span className={`block text-sm font-medium ${mode === m ? 'text-accent-dim' : 'text-zinc-800'}`}>{MODE_COPY[m].title}</span>
                <span className="block text-xs text-muted mt-0.5">{MODE_COPY[m].description}</span>
              </button>
            ))}
          </div>
        )}

        <label className="block text-sm text-zinc-700">
          名称
          <input autoFocus className="input mt-1.5" placeholder={activeMode === 'main' ? '例如：完成个人作品集' : activeMode === 'daily' ? '例如：饭后散步 10 分钟' : '例如：预约体检'} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm text-zinc-700">
          说明 <span className="text-xs text-muted">（可选）</span>
          <textarea className="input mt-1.5" rows={2} placeholder="补充一点让未来的自己看得懂的信息" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        {activeMode !== 'main' && (
          <>
            {editing ? (
              <div className="rounded-lg bg-ink-800/60 p-3 text-xs text-muted">当前完成奖励：+{editing.xpReward ?? 0} XP。编辑计划不会重新计算这项奖励。</div>
            ) : (
              <details className="rounded-xl border border-line p-3">
                <summary className="cursor-pointer text-sm font-medium text-zinc-700">奖励与关联（选填）</summary>
                <div className="space-y-3 mt-3">
                  <div>
                    <div className="text-sm text-zinc-700 mb-1.5">完成奖励：+{xpReward} XP</div>
                    <div className="flex gap-1.5">
                      {(Object.keys(DIFFICULTY_PRESET) as Difficulty[]).map((d) => (
                        <button type="button" key={d} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d}
                          className={`btn flex-1 text-xs ${difficulty === d ? 'border-accent/50 text-accent' : ''}`}>
                          {DIFFICULTY_PRESET[d].label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted mt-1">选择难度会按应用现有规则设置经验值；不改变成长规则。</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-muted">
                      关联个人资本
                      <select aria-label="关联个人资本" className="input mt-1" value={capitalKey} onChange={(e) => setCapitalKey(e.target.value as CapitalKey)}>
                        <option value="">不关联</option>
                        {Object.entries(CAPITAL_META).map(([k, v]) => (<option key={k} value={k}>{v.name}</option>))}
                      </select>
                    </label>
                    <label className="text-xs text-muted">
                      关联技能
                      <select aria-label="关联技能" className="input mt-1" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                        <option value="">不关联</option>
                        {s.skills.map((sk) => (<option key={sk.id} value={sk.id}>{sk.name}</option>))}
                      </select>
                    </label>
                  </div>

                  <label className="block text-xs text-muted">
                    预计用时（分钟）
                    <input aria-label="预计用时（分钟）" type="number" className="input mt-1" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} min={0} />
                  </label>
                </div>
              </details>
            )}
          </>
        )}

        {activeMode === 'main' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label mb-1.5">所属领域</div>
                <select aria-label="所属领域" className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
                  {s.domains.map((d) => (<option key={d.key} value={d.key}>{d.name}</option>))}
                </select>
              </div>
              <div>
                <div className="label mb-1.5">目标日期（可选）</div>
                <input aria-label="目标日期" type="date" className="input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="label mb-1.5">阶段（可选，每行一个）</div>
              <textarea aria-label="目标阶段" className="input" rows={4} placeholder={'阶段一\n阶段二\n阶段三'} value={milestonesText} onChange={(e) => setMilestonesText(e.target.value)} />
            </div>
          </>
        )}

        <button className="btn-primary w-full" onClick={submit} disabled={!title.trim()}>
          {editing ? '保存修改' : '添加到计划'}
        </button>
      </div>
    </Modal>
  )
}
