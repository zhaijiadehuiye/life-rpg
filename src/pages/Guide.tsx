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
        <Step number="☀" title="先看看自己的生活">
          「今天」最上方会显示睡眠、醒来时间和每日自评分。点睡眠卡片补记起止时间，点「记一段活动」记录已经发生的工作、学习、运动或休息；点「补记 / 修改」填写吃了什么、做了什么和今天的感受。保存后直接显示在首页。
        </Step>
        <Step number="1" title="先看今天要做的事">
          生活看板下方的「今日任务」是你自己添加的固定习惯和一次性事项。做完一项就点旁边的圆圈；没有待办时，可以去「计划」添加，也可以留空。
        </Step>
        <Step number="2" title="状态记录是可选的">
          想记今天的睡眠、精力、专注等状态时，再填写首页的状态卡片。保存后会出现三条行动建议；它们和你安排的任务分开，你可以忽略。
        </Step>
        <Step number="3" title="做完后点勾选">
          完成计划或行动建议时会按当前规则增加经验；同一项不能通过重复点击反复领奖励。获得的经验不会因休息或连续记录中断而减少。
        </Step>
        <Step number="4" title="可选：留下一段文字">
          到「每日记录」写醒来时间、吃了什么、做过什么、运动情况，也可以给今天打 1–10 分。每项都可跳过。想保存多条原始记录并保留每次修改，使用「自我历史学」。
        </Step>
        <Link to="/" className="btn-primary inline-flex">回到今天 <ArrowRight size={15} /></Link>
      </section>

      <section className="card-pad space-y-3">
        <h2 className="text-base font-semibold text-zinc-800">怎样看睡眠和时间图表</h2>
        <GuideRow title="睡眠与午睡" detail="睡眠按醒来日期归属，可以记录多段，时长相加；首页起止时间显示最长的一段。作息时间轴显示昨天 18 点到今天 18 点。这里的时长是按填写的起止估算，不是设备监测。" />
        <GuideRow title="时间分布" detail="按当天 00:00–24:00 的实际部分汇总。跨午夜自动拆分，时段不能重叠；灰色表示未记录或还没到的时间，不代表休息。日记文字和任务预计时长不会变成活动时长。" />
        <GuideRow title="7 天均值" detail="未记录的日子留空，不当作 0 小时。优先使用睡眠时段，缺少时段时使用旧版状态中的自报时长；旧版醒来时间不会被用来倒推入睡时间。" />
        <GuideRow title="补记和修改" detail="首页展开「查看 / 修改时段记录」可以修改或删除某一段，也可另记午睡。日期可改成过去日期；每段保存后立即更新同一份本地数据，不会自动完成任务或增加经验。" />
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
        <GuideRow title="每日记录" detail="按日期保存自评分和日常文字：醒来时间、饮食、活动、不顺心的事、运动情况都可选填。再次保存当天内容会更新这一天的记录；它不保留修订历史。" />
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
