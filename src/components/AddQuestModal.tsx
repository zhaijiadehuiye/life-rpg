import { useState } from 'react'
import { Modal } from './Modal'
import { useGameStore } from '../store/useGameStore'
import { CAPITAL_META } from '../data/constants'
import { DIFFICULTY_PRESET } from '../utils/xp'
import type { CapitalKey, Difficulty } from '../types'

type Mode = 'side' | 'daily' | 'main'

export function AddQuestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  const preset = DIFFICULTY_PRESET[difficulty]
  const xpReward = preset.min + Math.round((preset.max - preset.min) / 2)

  const reset = () => {
    setTitle(''); setDescription(''); setDifficulty('normal'); setCapitalKey('')
    setSkillId(''); setMinutes(30); setMilestonesText(''); setTargetDate('')
  }

  const submit = () => {
    if (!title.trim()) return
    if (mode === 'side') {
      s.addSideQuest({ title: title.trim(), description: description.trim(), difficulty, xpReward, capitalKey: capitalKey || undefined, skillId: skillId || undefined, minutes })
    } else if (mode === 'daily') {
      s.addDailyQuest({ title: title.trim(), description: description.trim(), difficulty, xpReward, capitalKey: capitalKey || undefined, skillId: skillId || undefined, minutes })
    } else {
      s.addMainQuest({
        title: title.trim(), description: description.trim(), domain, difficulty,
        targetDate: targetDate || undefined, startDate: new Date().toISOString().slice(0, 10),
        milestones: milestonesText.split('\n').map((t) => t.trim()).filter(Boolean),
      })
    }
    reset(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="新建任务">
      <div className="space-y-4">
        <div className="flex gap-1.5">
          {(['side', 'daily', 'main'] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`btn flex-1 ${mode === m ? 'border-accent/50 text-accent' : ''}`}>
              {m === 'side' ? '支线' : m === 'daily' ? '日常' : '主线'}
            </button>
          ))}
        </div>

        <input className="input" placeholder={mode === 'main' ? '主线标题，例：英语达到 B2' : '任务标题'} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={2} placeholder="描述（可选）" value={description} onChange={(e) => setDescription(e.target.value)} />

        {mode !== 'main' && (
          <>
            <div>
              <div className="label mb-1.5">难度 · 默认奖励 {xpReward} XP</div>
              <div className="flex gap-1.5">
                {(Object.keys(DIFFICULTY_PRESET) as Difficulty[]).map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`btn flex-1 text-xs ${difficulty === d ? 'border-accent/50 text-accent' : ''}`}>
                    {DIFFICULTY_PRESET[d].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label mb-1.5">关联资本</div>
                <select className="input" value={capitalKey} onChange={(e) => setCapitalKey(e.target.value as CapitalKey)}>
                  <option value="">不关联</option>
                  {Object.entries(CAPITAL_META).map(([k, v]) => (<option key={k} value={k}>{v.name}</option>))}
                </select>
              </div>
              <div>
                <div className="label mb-1.5">关联技能</div>
                <select className="input" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                  <option value="">不关联</option>
                  {s.skills.map((sk) => (<option key={sk.id} value={sk.id}>{sk.name}</option>))}
                </select>
              </div>
            </div>

            <div>
              <div className="label mb-1.5">投入时间（分钟）</div>
              <input type="number" className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} min={0} />
            </div>
          </>
        )}

        {mode === 'main' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label mb-1.5">所属领域</div>
                <select className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
                  {s.domains.map((d) => (<option key={d.key} value={d.key}>{d.name}</option>))}
                </select>
              </div>
              <div>
                <div className="label mb-1.5">目标日期（可选）</div>
                <input type="date" className="input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="label mb-1.5">阶段（每行一个）</div>
              <textarea className="input" rows={4} placeholder={'阶段一\n阶段二\n阶段三'} value={milestonesText} onChange={(e) => setMilestonesText(e.target.value)} />
            </div>
          </>
        )}

        <button className="btn-primary w-full" onClick={submit} disabled={!title.trim()}>创建</button>
      </div>
    </Modal>
  )
}
