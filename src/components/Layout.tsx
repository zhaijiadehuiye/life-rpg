import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, User, Scroll, Swords, BookOpen, Trophy, Map as MapIcon, BarChart3, Settings,
} from 'lucide-react'

const NAV = [
  { to: '/', label: '首页', icon: LayoutDashboard, end: true },
  { to: '/character', label: '角色', icon: User },
  { to: '/quests', label: '任务', icon: Scroll },
  { to: '/skills', label: '技能', icon: Swords },
  { to: '/journal', label: '日志', icon: BookOpen },
  { to: '/achievements', label: '成就', icon: Trophy },
  { to: '/map', label: '地图', icon: MapIcon },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings },
]

export function Layout() {
  return (
    <div className="min-h-full flex">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-line bg-ink-900/60 backdrop-blur sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-accent font-mono text-sm tracking-widest">LIFE RPG</div>
          <div className="text-[11px] text-muted mt-0.5">人生游戏化操作系统</div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-ink-800 text-accent shadow-glow border border-accent/20'
                    : 'text-muted hover:text-zinc-800 hover:bg-ink-800/60 border border-transparent'
                }`
              }
            >
              <n.icon size={16} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-line text-[10px] text-muted/60">
          数据仅保存在本机浏览器
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-20 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-900/90 backdrop-blur border-t border-line">
        <div className="grid grid-cols-5">
          {NAV.slice(0, 5).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? 'text-accent' : 'text-muted'}`
              }
            >
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))}
          <NavLink
            to="/more"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? 'text-accent' : 'text-muted'}`
            }
          >
            <Settings size={18} />
            更多
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
