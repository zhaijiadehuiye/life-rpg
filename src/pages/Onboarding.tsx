import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { CAPITAL_META } from '../data/constants'
import type { CapitalKey, MentalState } from '../types'

const MENTAL_FIELDS: { key: keyof Omit<MentalState, 'date'>; label: string; hint: string }[] = [
  { key: 'energy', label: '精力 Energy', hint: '今天的体能储备' },
  { key: 'focus', label: '注意力 Focus', hint: '能专注多久' },
  { key: 'stress', label: '压力 Stress', hint: '越高越紧绷' },
  { key: 'mood', label: '情绪 Mood', hint: '整体心情' },
  { key: 'selfEfficacy', label: '自我效能 Self-Efficacy', hint: '相信自己能做成的程度' },
  { key: 'socialBattery', label: '社交电量 Social Battery', hint: '还能应付多少人际' },
]

export default function Onboarding() {
  const startDemo = useGameStore((s) => s.startDemo)
  const completeOnboarding = useGameStore((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['health', 'learn', 'career'])
  const [ratings, setRatings] = useState<Record<CapitalKey, number>>({
    physical: 30, cultural: 30, economic: 30, social: 30, symbolic: 20, time: 30,
  })
  const [mental, setMental] = useState({
    energy: 60, focus: 60, stress: 40, mood: 60, selfEfficacy: 50, socialBattery: 60,
  })
  const [firstQuest, setFirstQuest] = useState('')
  const allDomains = useGameStore((s) => s.domains)

  const next = () => setStep((s) => Math.min(4, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))
  const finish = () => {
    completeOnboarding({ name, selectedDomains, capitalRatings: ratings, initialMental: mental, firstMainQuestTitle: firstQuest })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="font-mono text-accent tracking-[0.3em] text-sm">LIFE OS</div>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-2 text-zinc-800">建立你的个人空间</h1>
          <p className="text-muted text-sm mt-2">用计划、成长记录和每日回顾，按自己的节奏整理生活。</p>
        </div>

        <Link to="/guide" className="block mb-4 text-center text-sm text-accent underline underline-offset-2">不会用？先看使用引导</Link>

        <Link to="/journal?tab=notes" className="card-pad block mb-6 text-sm hover:border-accent/40">
          <span className="font-semibold text-accent">只想随手记？直接开始记录 →</span>
          <span className="block text-muted mt-1">可以单独使用，不需要创建成长档案。</span>
        </Link>

        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-white/10'}`} />
          ))}
        </div>

        <div className="card-pad">
          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-800">给个人空间起个名字</h2>
              <p className="text-muted text-sm mt-1">可选。留空会使用默认名称，之后可以修改。</p>
              <input className="input mt-4" placeholder="你的名字或昵称（可选）" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <div className="flex justify-between mt-6">
                <button className="btn" onClick={startDemo}>载入示例数据</button>
                <button className="btn-primary" onClick={next}>下一步</button>
              </div>
              <p className="text-[11px] text-muted mt-3">示例数据会保存到本机浏览器，可在设置中清除。</p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-800">哪些生活领域对你重要？</h2>
              <p className="text-muted text-sm mt-1">可选 2–4 项，用来整理长期方向；之后也能调整。</p>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {allDomains.map((d) => {
                  const on = selectedDomains.includes(d.key)
                  return (
                    <button key={d.key}
                      onClick={() => setSelectedDomains((prev) => on ? prev.filter((k) => k !== d.key) : prev.length >= 4 ? prev : [...prev, d.key])}
                      className={`rounded-lg border px-3 py-3 text-sm transition-colors ${on ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line bg-ink-800 text-muted'}`}>
                      {d.name}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-between mt-6">
                <button className="btn" onClick={back}>返回</button>
                <button className="btn-primary" onClick={next}>下一步</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-800">记录个人资源的起点</h2>
              <p className="text-muted text-sm mt-1">这些滑块只是自我追踪起点，不是对人的价值评分；可以先用默认值。</p>
              <div className="mt-4 space-y-3">
                {(Object.keys(CAPITAL_META) as CapitalKey[]).map((k) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-700">{CAPITAL_META[k].name}</span>
                      <span className="text-accent font-mono">{ratings[k]}</span>
                    </div>
                    <div className="text-[11px] text-muted">{CAPITAL_META[k].hint}</div>
                    <input type="range" min={0} max={100} value={ratings[k]}
                      onChange={(e) => setRatings((r) => ({ ...r, [k]: Number(e.target.value) }))}
                      className="w-full mt-1" />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button className="btn" onClick={back}>返回</button>
                <button className="btn-primary" onClick={next}>下一步</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-800">今天的状态参考</h2>
              <p className="text-muted text-sm mt-1">按自己的感觉设置即可。它不会改变完成任务时的经验奖励。</p>
              <div className="mt-4 space-y-3">
                {MENTAL_FIELDS.map((f) => (
                  <div key={f.key}>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-700">{f.label}</span>
                      <span className="text-accent font-mono">{mental[f.key]}</span>
                    </div>
                    <div className="text-[11px] text-muted">{f.hint}</div>
                    <input type="range" min={0} max={100} value={mental[f.key]}
                      onChange={(e) => setMental((m) => ({ ...m, [f.key]: Number(e.target.value) }))}
                      className="w-full mt-1" />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button className="btn" onClick={back}>返回</button>
                <button className="btn-primary" onClick={next}>下一步</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-800">想先推进一个长期目标吗？</h2>
              <p className="text-muted text-sm mt-1">可选。也可以先留空，之后在「计划与目标」里再添加。</p>
              <input className="input mt-4" placeholder="例如：完成一个个人作品" value={firstQuest} onChange={(e) => setFirstQuest(e.target.value)} />
              <div className="flex justify-between mt-6">
                <button className="btn" onClick={back}>返回</button>
                <button className="btn-primary" onClick={finish}>进入世界 →</button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted/60 mt-6">所有数据仅保存在你的浏览器本地。随时可导出 JSON 备份。</p>
      </div>
    </div>
  )
}
