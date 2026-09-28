import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { SKILL_CATEGORIES } from '../data/constants'
import { XpBar } from '../components/XpBar'
import { Modal } from '../components/Modal'

export default function Skills() {
  const s = useGameStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(SKILL_CATEGORIES[0].key)

  const byCat = SKILL_CATEGORIES.map((c) => ({ ...c, items: s.skills.filter((sk) => sk.category === c.key) }))

  const submit = () => {
    if (!name.trim()) return
    s.addSkill(name, category)
    setName('')
    setOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-800">技能树</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> 新技能</button>
      </div>

      {byCat.map((cat) => (
        <section key={cat.key}>
          <h2 className="label mb-2">{cat.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cat.items.length === 0 && <div className="col-span-full text-sm text-muted card-pad text-center">暂无</div>}
            {cat.items.map((sk) => (
              <div key={sk.id} className="card p-3">
                <div className="flex justify-between items-baseline">
                  <div className="text-sm text-zinc-800">{sk.name}</div>
                  <div className="text-xs text-accent font-mono">Lv.{sk.level}</div>
                </div>
                <div className="mt-2"><XpBar value={sk.xp} max={sk.xpToNext} height={4} /></div>
                <div className="mt-1.5 text-[11px] text-muted font-mono">
                  {sk.xp} / {sk.xpToNext} · 累计 {Math.round(sk.totalMinutes / 60)}h {sk.totalMinutes % 60}m
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <Modal open={open} onClose={() => setOpen(false)} title="新增技能">
        <div className="space-y-3">
          <input className="input" placeholder="技能名，例：西班牙语" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <div className="label mb-1.5">分类</div>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_CATEGORIES.map((c) => (
                <button key={c.key} onClick={() => setCategory(c.key)}
                  className={`btn text-xs ${category === c.key ? 'border-accent/50 text-accent' : ''}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full" onClick={submit} disabled={!name.trim()}>添加</button>
        </div>
      </Modal>
    </div>
  )
}
