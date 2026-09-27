import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useGameStore } from './store/useGameStore'
import { Layout } from './components/Layout'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Character from './pages/Character'
import Quests from './pages/Quests'
import Skills from './pages/Skills'
import Journal from './pages/Journal'
import Achievements from './pages/Achievements'
import MapPage from './pages/MapPage'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import More from './pages/More'

export default function App() {
  const hydrate = useGameStore((s) => s.hydrate)
  const initialized = useGameStore((s) => s.initialized)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    hydrate().finally(() => setReady(true))
  }, [hydrate])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted font-mono text-sm">
        加载角色数据…
      </div>
    )
  }

  if (!initialized) return <Onboarding />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="character" element={<Character />} />
        <Route path="quests" element={<Quests />} />
        <Route path="skills" element={<Skills />} />
        <Route path="journal" element={<Journal />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="map" element={<MapPage />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
        <Route path="more" element={<More />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
