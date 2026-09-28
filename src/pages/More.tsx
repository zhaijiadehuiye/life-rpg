import { Link } from 'react-router-dom'
import { BookOpen, Trophy, Map as MapIcon, BarChart3, Settings, User, Scroll, Swords } from 'lucide-react'

export default function More() {
  const items = [
    { to: '/character', label: '角色', icon: User },
    { to: '/quests', label: '任务', icon: Scroll },
    { to: '/skills', label: '技能', icon: Swords },
    { to: '/journal', label: '日志', icon: BookOpen },
    { to: '/achievements', label: '成就', icon: Trophy },
    { to: '/map', label: '地图', icon: MapIcon },
    { to: '/stats', label: '统计', icon: BarChart3 },
    { to: '/settings', label: '设置', icon: Settings },
  ]
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-zinc-800 mb-4">更多</h1>
      {items.map((it) => (
        <Link key={it.to} to={it.to} className="card-pad flex items-center gap-3 text-sm text-zinc-700 hover:border-accent/40">
          <it.icon size={18} className="text-accent" />
          {it.label}
        </Link>
      ))}
    </div>
  )
}
