import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { setWalkthroughStep, walkthroughStep } from '../utils/walkthrough'

const STEPS = [
  { to: '/', title: '先认识「今天」', description: '上方看睡眠和当天记录。点睡眠卡片填写入睡与醒来；「记一段活动」填写已经发生的时间。可以留空，不用补齐。' },
  { to: '/journal', title: '给今天留几句话', description: '「每日总结」记录饮食、日常和感受，点击下方保存。想写多条事情，切到「随手记」，以后修订会保留旧版本。不用两个都填。' },
  { to: '/quests', title: '安排一件能完成的小事', description: '点「添加计划」，一次性的事选「一次性事项」，每天想做的选「固定习惯」。完成后点圆圈，休息不会扣经验。' },
  { to: '/timeline', title: '以后在这里回看', description: '每日总结和随手记会一起显示在历史记录。积累一些材料后，再按需要打开「复盘与探索」；不必把所有功能都用起来。' },
]
export function GuidedWalkthrough() {
  const [step, setStep] = useState(walkthroughStep)
  const navigate = useNavigate()
  useEffect(() => {
    const change = (event: Event) => setStep((event as CustomEvent<number | null>).detail)
    window.addEventListener('life-os:walkthrough', change)
    return () => window.removeEventListener('life-os:walkthrough', change)
  }, [])
  if (step === null) return null
  const current = STEPS[step]
  const move = (index: number) => { setWalkthroughStep(index); navigate(STEPS[index].to) }
  return <aside aria-label="操作引导" className="rounded-2xl border border-accent/20 bg-mint/60 p-4 mb-5 space-y-3">
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-accent-dim">跟着做一遍 · 第 {step + 1} / 4 步</p><button aria-label="结束操作引导" className="text-muted p-1" onClick={() => setWalkthroughStep(null)}><X size={16} /></button></div>
    <div><h2 className="text-sm font-semibold text-zinc-800">{current.title}</h2><p className="text-sm text-zinc-600 mt-1 leading-relaxed">{current.description}</p></div>
    <div className="flex flex-wrap items-center gap-3"><Link className="text-xs text-accent underline underline-offset-4" to={current.to}>打开这一步的页面</Link><div className="ml-auto flex gap-2">{step > 0 && <button className="btn-ghost text-xs" onClick={() => move(step - 1)}>上一步</button>}<button className="btn-primary text-xs" onClick={() => step === STEPS.length - 1 ? setWalkthroughStep(null) : move(step + 1)}>{step === STEPS.length - 1 ? '我知道怎么用了' : '下一步'}</button></div></div>
  </aside>
}
