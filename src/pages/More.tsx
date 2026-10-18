import { Link } from 'react-router-dom'
import { BookOpen, History, Lightbulb, Trophy, Map as MapIcon, BarChart3, Settings, User, Scroll, Swords, CircleHelp } from 'lucide-react'

export default function More() {
  const items = [
    { to: '/guide', label: '使用引导', description: '从这里开始，跟着做一遍', icon: CircleHelp },
    { to: '/timeline', label: '历史记录', description: '一起回看每日总结、随手记和原文修订', icon: History },
    { to: '/reflection', label: '复盘与探索', description: '失败复盘、整理想法、证据、小实验和预测', icon: Lightbulb },
    { to: '/character', label: '成长概览', description: '查看经验、等级和个人资本', icon: User },
    { to: '/quests', label: '计划与目标', description: '管理一次性事项、日常习惯和长期目标', icon: Scroll },
    { to: '/skills', label: '技能', description: '记录正在练习的具体能力', icon: Swords },
    { to: '/journal', label: '每日记录', description: '按天写下生活回顾', icon: BookOpen },
    { to: '/achievements', label: '成就', description: '查看自动解锁的里程碑', icon: Trophy },
    { to: '/map', label: '人生地图', description: '浏览阶段路径与长期方向', icon: MapIcon },
    { to: '/stats', label: '趋势', description: '回看近期状态和成长变化', icon: BarChart3 },
    { to: '/settings', label: '设置与备份', description: '导出或导入本机存档', icon: Settings },
  ]
  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-zinc-800">更多</h1>
        <p className="text-sm text-muted mt-1">查看成长工具、记录和数据设置。</p>
      </div>
      {items.map((it) => (
        <Link key={it.to} to={it.to} className="card-pad flex items-center gap-3 text-sm text-zinc-700 hover:border-accent/40">
          <it.icon size={18} className="text-accent" />
          <span>
            <span className="block font-medium">{it.label}</span>
            <span className="block text-xs text-muted mt-0.5">{it.description}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}
