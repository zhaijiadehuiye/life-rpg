import { useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { Meter } from '../components/XpBar'
import { ResearchArchive } from '../components/research/ResearchArchive'
import { FailureReviewArchive } from '../components/research/FailureReviewArchive'
import { parseImport, STORAGE_VERSION } from '../lib/storage'

export default function Settings() {
  const s = useGameStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState('')
  const [preview, setPreview] = useState<{ text: string; name: string; logs: number; quests: number } | null>(null)

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const parsed = JSON.parse(await f.text())
      const text = JSON.stringify(parsed.product === 'Life OS' ? parsed.game : parsed)
      const result = parseImport(text)
      if (result.error || !result.state) setImportMsg(`导入失败：${result.error}`)
      else setPreview({ text, name: result.state.profile!.name, logs: result.state.logs.length, quests: result.state.dailyQuests.length + result.state.sideQuests.length + result.state.mainQuests.length })
    } catch { setImportMsg('无法读取这个 JSON 文件，当前数据未改变。') }
    e.target.value = ''
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-zinc-900">设置与备份</h1>
      <ResearchArchive />
      <FailureReviewArchive />
      {s.profile && <section className="card-pad">
        <h2 className="label mb-3">角色</h2>
        <div className="text-sm text-zinc-700">{s.profile?.name}</div>
        <div className="text-xs text-muted mt-1">Lv.{s.profile?.level} · 累计 {s.profile?.totalXp} XP · 创建于 {s.profile?.createdAt}</div>
      </section>}

      {s.profile && <section className="card-pad">
        <h2 className="label mb-3">人生领域 · 重要度 / 满意度 / 投入</h2>
        <p className="text-[11px] text-muted mb-3">自我追踪工具，不是科学评分。用于视觉化你现在的优先级。</p>
        <div className="space-y-3">
          {s.domains.map((d) => (
            <div key={d.key}>
              <div className="text-sm text-zinc-700">{d.name}</div>
              <div className="grid grid-cols-3 gap-3 mt-1.5">
                <DomainSlider label="重要" value={d.importance} onChange={(v) => s.updateDomain(d.key, { importance: v })} />
                <DomainSlider label="满意" value={d.satisfaction} onChange={(v) => s.updateDomain(d.key, { satisfaction: v })} />
                <DomainSlider label="投入" value={d.investment} onChange={(v) => s.updateDomain(d.key, { investment: v })} />
              </div>
            </div>
          ))}
        </div>
      </section>}

      <section className="card-pad">
        <h2 className="label mb-3">角色、计划与生活记录</h2>
        <div className="flex flex-wrap gap-2">
          {s.profile && <button className="btn-ghost" onClick={s.downloadBackup}>单独导出角色与生活记录</button>}
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>恢复角色与生活记录</button>
          <input ref={fileRef} aria-label="恢复角色与生活记录文件" type="file" accept="application/json" className="hidden" onChange={onImportFile} />
          {s.profile && <button className="btn-ghost border-danger/40 text-danger hover:bg-danger/10"
            onClick={() => {
              if (confirm('确定重建角色、计划与生活记录？这部分数据将被清空，请先导出备份。随手记和复盘档案不会改变。')) s.resetAll()
            }}>
            重建成长档案
          </button>}
        </div>
        {importMsg && <div className="text-xs text-muted mt-2">{importMsg}</div>}
        {preview && <div className="rounded-xl bg-peach/40 border border-line p-4 mt-4 space-y-3 text-sm"><p>备份角色：{preview.name} · {preview.logs} 份每日总结 · {preview.quests} 项计划。</p><p className="text-xs text-muted">确认后会替换当前角色、计划与生活记录，请先导出当前备份。随手记和复盘档案保留。</p><div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => { const result = s.importJson(preview.text); setImportMsg(result.ok ? '角色与生活记录已恢复。' : `导入失败：${result.error}`); if (result.ok) setPreview(null) }}>确认恢复这部分数据</button><button className="btn-ghost" onClick={() => setPreview(null)}>取消</button></div></div>}
        <details className="mt-3 text-[11px] text-muted"><summary className="cursor-pointer">存储详情</summary><p className="mt-2">角色与生活记录：localStorage，key = life-rpg:v1，schema v{STORAGE_VERSION}。随手记与定期复盘：沿用原 IndexedDB。失败复盘：独立 localStorage，key = life-os:failure-reviews:v1，schema v1。不自动搬迁存档。</p></details>
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
