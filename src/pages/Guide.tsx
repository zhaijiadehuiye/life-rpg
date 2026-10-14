import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CircleHelp, Download, NotebookPen, Scroll } from 'lucide-react'

export default function Guide() {
  return (
    <article className="max-w-3xl space-y-6">
      <header>
        <div className="text-xs text-accent font-medium">LIFE OS · 使用说明</div>
        <h1 className="text-2xl font-bold text-zinc-900 mt-1">先从今天的一件小事开始</h1>
        <p className="text-sm text-muted mt-2">这是给自己用的工具，不是考核表。状态记录、任务和每日回顾都可以跳过；休息不会扣掉已经获得的经验。</p>
      </header>

      <section className="card-pad space-y-4">
        <h2 className="text-base font-semibold text-zinc-800">最简单的日常用法</h2>
        <Step number="1" title="可选：记一下今天的状态">
          在首页调整睡眠、精力、专注等滑块并点「保存状态」。这只是给自己看的记录。保存后会生成三条行动建议；不想填就跳过。
        </Step>
        <Step number="2" title="选一项想做的事">
          首页的「今日任务」来自你自己添加的固定习惯和一次性事项；「行动建议」由状态生成。两者分开保存，你可以挑其中一项完成，也可以都不做。
        </Step>
        <Step number="3" title="做完后点勾选">
          完成计划或行动建议时会按当前规则增加经验；同一项不能通过重复点击反复领奖励。获得的经验不会因休息或连续记录中断而减少。
        </Step>
        <Step number="4" title="可选：留下一段文字">
          到「每日记录」写几句话回顾今天。想保存多条原始记录、查看每次修改，使用「自我历史学」。
        </Step>
        <Link to="/" className="btn-primary inline-flex">回到今天 <ArrowRight size={15} /></Link>
      </section>

      <section className="card-pad space-y-3">
        <h2 className="text-base font-semibold text-zinc-800 flex items-center gap-2"><Scroll size={17} className="text-accent" />「计划与目标」里有什么</h2>
        <GuideRow title="一次性事项" detail="只做一次，例如预约体检。完成后给一次经验。" />
        <GuideRow title="固定习惯" detail="每天可以完成一次。今天勾选后，明天会重新开放。" />
        <GuideRow title="长期目标" detail="需要较长时间的事。可以拆成多个阶段；每勾选完成一个阶段会增加 30 XP。" />
        <p className="text-xs text-muted">随机灵感卡片只是点子，不会自动变成计划，也不会自动给经验。未完成的事项可以留着或编辑；只有你明确确认后才会删除。</p>
        <Link to="/quests" className="text-sm text-accent underline underline-offset-2">打开计划与目标 →</Link>
      </section>

      <section className="card-pad space-y-3">
        <h2 className="text-base font-semibold text-zinc-800 flex items-center gap-2"><BookOpen size={17} className="text-accent" />这些记录有什么区别？</h2>
        <GuideRow title="每日记录" detail="Life RPG 的每日回顾，每个日期一份。再次保存当天内容会更新这一天的记录；它不保留修订历史。" />
        <GuideRow title="每日状态" detail="保存当天的睡眠和自我感受，可帮助生成行动建议。每个日期保留当前一份状态记录。" />
        <GuideRow title="自我历史学" detail="适合保存多条原始记事、回看时间线和整理假设；手动修改记录会留下修订历史。自动分析与原文分开。" />
        <p className="text-xs text-muted">所以：短回顾写「每日记录」；想长期积累、保留修改过程的材料写「自我历史学」。两边目前不会自动合并。</p>
        <Link to="/historian" className="inline-flex items-center gap-1 text-sm text-accent underline underline-offset-2"><NotebookPen size={14} />打开自我历史学 →</Link>
      </section>

      <section className="card-pad space-y-3">
        <h2 className="text-base font-semibold text-zinc-800 flex items-center gap-2"><Download size={17} className="text-accent" />数据与离线使用</h2>
        <GuideRow title="数据存在哪里" detail="Life RPG 数据在当前浏览器的本地存储；自我历史学的数据在当前浏览器的 IndexedDB。清除浏览器网站数据前，请先分别导出备份。" />
        <GuideRow title="怎样备份" detail="Life RPG：打开「更多 → 设置与备份 → 导出 JSON 备份」。自我历史学：在其菜单中使用导出备份。" />
        <GuideRow title="怎样离线打开" detail="先联网打开一次应用，等待页面加载完成；之后已缓存的页面可以离线使用。首次打开或清理浏览器数据后，需要联网重新加载。" />
        <p className="text-xs text-muted">不同网站地址的本地数据彼此隔离。跨地址使用时，要从旧地址显式导出，再在新地址导入；应用不会偷偷读取或迁移另一地址的数据。</p>
        <Link to="/more" className="inline-flex items-center gap-1 text-sm text-accent underline underline-offset-2"><CircleHelp size={14} />返回更多功能</Link>
      </section>

      <p className="text-xs text-muted">你不需要把所有模块都用起来。先留下一个看得懂的计划，再按自己的节奏调整即可。</p>
    </article>
  )
}

function Step({ number, title, children }: { number: string; title: string; children: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-7 h-7 rounded-full bg-mint text-accent-dim flex items-center justify-center text-sm font-semibold shrink-0">{number}</span>
      <div>
        <h3 className="text-sm font-medium text-zinc-800">{title}</h3>
        <p className="text-sm text-muted mt-1">{children}</p>
      </div>
    </div>
  )
}

function GuideRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-800">{title}</h3>
      <p className="text-sm text-muted mt-0.5">{detail}</p>
    </div>
  )
}
