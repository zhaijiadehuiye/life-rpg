import { useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { Meter } from '../components/XpBar'

export default function Settings() {
  const s = useGameStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState('')

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const text = await f.text()
    const r = s.importJson(text)
    setImportMsg(r.ok ? '导入成功。' : `导入失败：${r.error}`)
    e.target.value = ''
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-zinc-100">设置</h1>
      <section className="card-pad">
        <h2 className="label mb-3">角色</h2>
        <div className="text-sm text-zinc-200">{s.profile?.name}</div>
        <div className="text-xs text-muted mt-1">Lv.{s.profile?.level} · 累计 {s.profile?.totalXp} XP · 创建于 {s.profile?.createdAt}</div>
      </section>

      <section className="card-pad">
        <h2 className="label mb-3">人生领域 · 重要度 / 满意度 / 投入</h2>
        <p className="text-[11px] text-muted mb-3">自我追踪工具，不是科学评分。用于视觉化你现在的优先级。</p>
        <div className="space-y-3">
          {s.domains.map((d) => (
            <div key={d.key}>
              <div className="text-sm text-zinc-200">{d.name}</div>
              <div className="grid grid-cols-3 gap-3 mt-1.5">
                <DomainSlider label="重要" value={d.importance} onChange={(v) => s.updateDomain(d.key, { importance: v })} />
                <DomainSlider label="满意" value={d.satisfaction} onChange={(v) => s.updateDomain(d.key, { satisfaction: v })} />
                <DomainSlider label="投入" value={d.investment} onChange={(v) => s.updateDomain(d.key, { investment: v })} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card-pad">
        <h2 className="label mb-3">数据</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={s.downloadBackup}>导出 JSON 备份</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>导入 JSON</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
          <button className="btn border-danger/40 text-danger hover:bg-danger/10"
            onClick={() => {
              if (confirm('确定清空所有数据并重新开始？此操作不可恢复。建议先导出备份。')) s.resetAll()
            }}>
            清空数据并重新开始
          </button>
        </div>
        {importMsg && <div className="text-xs text-muted mt-2">{importMsg}</div>}
        <p className="text-[11px] text-muted mt-3">数据存储：浏览器 localStorage（key = life-rpg:v1）。未来可无缝迁移到 IndexedDB / Supabase。</p>
      </section>
    </div>
  )
}

function DomainSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted"><span>{label}</span><span className="font-mono">{value}</span></div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <Meter value={value} />
    </div>
  )
}
