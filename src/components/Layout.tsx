import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, User, Scroll, Swords, BookOpen, History, Lightbulb, CircleHelp, Trophy, Map as MapIcon, BarChart3, Settings,
} from 'lucide-react'
import { ResearchProvider } from './ResearchProvider'
import { GuidedWalkthrough } from './GuidedWalkthrough'

const NAV = [
  { to: '/', label: '今天', icon: LayoutDashboard, end: true },
  { to: '/character', label: '成长', icon: User },
  { to: '/quests', label: '计划', icon: Scroll },
  { to: '/skills', label: '技能', icon: Swords },
  { to: '/journal', label: '每日记录', icon: BookOpen },
  { to: '/timeline', label: '历史记录', icon: History },
  { to: '/reflection', label: '复盘与探索', icon: Lightbulb },
  { to: '/achievements', label: '成就', icon: Trophy },
  { to: '/map', label: '地图', icon: MapIcon },
  { to: '/stats', label: '趋势', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings },
]

export function Layout() {
  return (
    <ResearchProvider><div className="min-h-full flex">
      <ScrollToTop />
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-line bg-ink-900/60 backdrop-blur sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-accent font-mono text-sm tracking-widest">LIFE OS</div>
          <div className="text-[11px] text-muted mt-0.5">人生操作系统 · v0.6</div>
        </div>
        <nav aria-label="桌面主导航" className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <NavLink to="/guide" className={({ isActive }) => `flex items-center gap-2.5 px-3 py-3 mb-3 rounded-xl text-sm font-semibold border ${isActive ? 'bg-mint text-accent-dim border-accent/30' : 'bg-mint/40 text-accent-dim border-accent/10 hover:bg-mint/70'}`}><CircleHelp size={17} /> 使用引导 <span className="ml-auto text-[10px] font-normal">从这里开始</span></NavLink>
          {[
            { label: '日常', paths: ['/', '/journal', '/timeline', '/quests'] },
            { label: '回顾与理解', paths: ['/reflection'] },
            { label: '成长与工具', paths: ['/character', '/skills', '/stats', '/achievements', '/map', '/settings'] },
          ].map((group) => <div key={group.label} className="pb-2"><div className="px-3 pt-3 pb-1.5 text-[10px] text-muted/80">{group.label}</div>{group.paths.map((path) => NAV.find((item) => item.to === path)!).map((n) => (
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
          ))}</div>)}
        </nav>
        <div className="px-5 py-3 border-t border-line text-[10px] text-muted/60">
          数据仅保存在本机浏览器
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-20 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex md:hidden items-center justify-between mb-4"><span className="text-xs font-mono tracking-widest text-accent">LIFE OS</span><NavLink to="/guide" className="inline-flex items-center gap-1.5 rounded-full bg-mint/70 px-3 py-1.5 text-xs text-accent-dim"><CircleHelp size={14} /> 使用引导</NavLink></div>
          <GuidedWalkthrough />
          <Outlet />
        </div>
      </main>

      <nav aria-label="移动主导航" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-900/90 backdrop-blur border-t border-line">
        <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {NAV.filter((n) => ['/', '/quests', '/journal', '/timeline'].includes(n.to)).map((n) => (
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
    </div></ResearchProvider>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
