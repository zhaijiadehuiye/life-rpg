import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Play, Sunrise, NotebookPen, History, CircleHelp } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { setWalkthroughStep } from '../utils/walkthrough'

export default function Guide() {
  const initialized = useGameStore((state) => state.initialized)
  const navigate = useNavigate()
  return <article className="max-w-4xl space-y-5">
    <header><div className="text-xs text-accent font-medium">LIFE OS · 从这里开始</div><h1 className="text-3xl font-bold text-zinc-900 mt-2">这个网页怎么用？</h1><p className="text-sm text-muted mt-3 leading-relaxed max-w-2xl">这是你自己的生活记录本。先记日常，想做事时加个计划，有空再回看。状态记录、任务和每日回顾都可以跳过，休息不会扣经验。</p></header>
    <section className="card-pad bg-mint/30"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-base font-semibold">第一次用，跟着做一遍</h2><p className="text-sm text-muted mt-1">4 个步骤，会带你打开实际页面；按自己的节奏操作，随时可以退出。</p></div>{initialized ? <button className="btn-primary" onClick={() => { setWalkthroughStep(0); navigate('/') }}><Play size={15} /> 开始操作引导</button> : <Link className="btn-primary" to="/">先创建自己的档案 <ArrowRight size={15} /></Link>}</div></section>
    <section><h2 className="label mb-3">每天只需要按自己的需要做这些</h2><div className="grid sm:grid-cols-3 gap-3">{[
      { icon: Sunrise, when: '早上 · 记作息', title: '昨晚睡得怎么样？', text: '打开「今天」，点睡眠卡片填入睡和醒来时间。白天也可以补记工作、学习、休息等时段。', to: '/', action: '打开今天' },
      { icon: NotebookPen, when: '白天 · 随时记', title: '有件事想留下来？', text: '在「每日记录 → 随手记」写几句话，同一天可写多条。以后补充会保留原文和旧版本。', to: '/journal?tab=notes', action: '写一条随手记' },
      { icon: History, when: '晚上 · 简单总结', title: '今天过得如何？', text: '在「每日总结」记吃了什么、做了什么、运动和感受。可给当天打分，每项都能跳过。', to: '/journal', action: '记今天的总结' },
    ].map((item) => <div key={item.to} className="card-pad flex flex-col"><div className="text-xs text-accent flex items-center gap-2"><item.icon size={16} />{item.when}</div><h3 className="font-semibold text-zinc-800 mt-3">{item.title}</h3><p className="text-sm text-muted leading-relaxed mt-2 mb-4">{item.text}</p><Link className="text-sm text-accent underline underline-offset-4 mt-auto" to={item.to}>{item.action} →</Link></div>)}</div></section>
    <section className="card-pad space-y-4"><h2 className="text-base font-semibold">左边的菜单分别做什么？</h2><div className="space-y-3">{[
      ['/', '今天', '看睡眠、活动分布和今日任务。生活记录在上方，任务在下面。'],
      ['/journal', '每日记录', '写每天的总结，或随时记一条想保留的事。不用两种都填。'],
      ['/timeline', '历史记录', '按日期一起回看总结和随手记，可以搜索，也能查看和追加原文修订。'],
      ['/quests', '计划', '自己安排想做的事。一次性事项做一次；固定习惯每天可完成一次；长期目标可以拆成阶段。'],
      ['/reflection', '复盘与探索', '有了一些记录以后，再按需要找线索、整理想法、做小实验、记录预测和复盘。'],
      ['/character', '成长与工具', '成长、技能、成就、地图和趋势用于回看积累，不需要每天打开。'],
      ['/settings', '设置与备份', '下载整站 JSON 备份；换浏览器、换设备或清理网站数据前先导出。'],
    ].map(([to, title, text]) => <div key={title} className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><Link className="text-sm text-accent-dim font-medium shrink-0 w-24" to={to}>{title} →</Link><p className="text-sm text-muted leading-relaxed">{text}</p></div>)}</div></section>
    <section className="card-pad space-y-3"><h2 className="text-base font-semibold">计划和记录有什么关系？</h2><p className="text-sm text-muted leading-relaxed">计划是「我想做什么」，记录是「实际发生了什么」。在计划里做完一项再点圆圈，按原有规则获得经验；写日记或记时段不会自动完成任务。没做、漏记、休息都不会扣掉已有经验。</p><Link className="text-sm text-accent underline underline-offset-4 inline-flex" to="/quests">去添加一件小事 →</Link></section>
    <section className="card-pad space-y-3"><h2 className="text-base font-semibold">不懂「复盘与探索」，可以先不用</h2><p className="text-sm text-muted leading-relaxed">「回看线索」展示常写的主题；「想法与证据」保留待验证的解释；「小实验」尝试一种改变；「我的预测」以后核对猜测；「定期复盘」留下自己的总结。它们不会强迫你打卡，也不会替你判断你是怎样的人。</p></section>
    <details className="card-pad"><summary className="text-base font-semibold cursor-pointer flex items-center gap-2"><CircleHelp size={16} /> 睡眠图表和数据怎么保存？</summary><div className="text-sm text-muted leading-relaxed mt-4 space-y-3"><p>睡眠按醒来那天计算，夜间睡眠和午睡可以分开记。时间分布只算落在当天的部分；未记录的日子留空，不当作零分或休息。图表不从日记文字推算时长。</p><p>同一浏览器里的旧记录继续可用。原自我历史学的八个功能已放进当前界面，旧原文、修订和档案保留在原位置。记录不上传到 GitHub。</p><p>打开「设置与备份 → 导出整站 JSON 备份」下载到自己设备。不同浏览器、设备和域名的数据不自动互通，需要你显式导出和导入。</p><p>先联网打开一次，完成资源加载后可以离线使用。没有保存的输入离开页面后不会保留；清除网站数据前务必导出备份。</p><Link to="/settings" className="text-accent underline underline-offset-4">打开设置与备份 →</Link></div></details>
    <p className="text-xs text-muted">左侧最上方或手机顶部随时可以重新打开「使用引导」。不用把全部功能都用起来。</p>
  </article>
}
