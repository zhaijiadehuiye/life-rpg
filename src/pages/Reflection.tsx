import { useSearchParams } from 'react-router-dom'
import { ResearchBoundary, ResearchHeader } from '../components/ResearchUI'
import { Patterns } from '../components/research/Patterns'
import { Hypotheses } from '../components/research/Hypotheses'
import { Experiments } from '../components/research/Experiments'
import { Predictions } from '../components/research/Predictions'
import { Reviews } from '../components/research/Reviews'

const VIEWS = [
  { key: 'patterns', label: '回看线索', component: Patterns },
  { key: 'hypotheses', label: '想法与证据', component: Hypotheses },
  { key: 'experiments', label: '小实验', component: Experiments },
  { key: 'predictions', label: '我的预测', component: Predictions },
  { key: 'reviews', label: '定期复盘', component: Reviews },
]
export default function Reflection() {
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((view) => view.key === params.get('view')) ?? VIEWS[0]
  return <div className="space-y-5"><ResearchHeader title="复盘与探索" description="积累一些记录后，再来了解自己的变化。这些功能都可选，不用一次全部学会。" />
    <nav aria-label="复盘功能" className="flex flex-wrap gap-2">{VIEWS.map((item) => <button key={item.key} className={`research-tab ${view.key === item.key ? 'research-tab-active' : ''}`} aria-current={item.key === view.key ? 'page' : undefined} onClick={() => setParams({ view: item.key })}>{item.label}</button>)}</nav>
    <ResearchBoundary><view.component key={view.key} /></ResearchBoundary>
  </div>
}
