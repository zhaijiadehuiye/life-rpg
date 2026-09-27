import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Activity, ArrowUpRight, Check, ChevronRight, Compass, HeartPulse, History, Moon, Pencil, Plus, RotateCcw, Save, Sparkles, Target, Trophy, Wallet, X, Zap } from 'lucide-react'
import type { AppData, CapitalKey, Quest, QuestType } from './types'
import { loadData, resetData, saveData } from './lib/storage'
import { capitalKeys, capitalMeta, makeId, relativeTime, xpProgress } from './lib/utils'

const moodLabels = ['低落', '平稳', '不错', '高涨']

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [showCharacterEditor, setShowCharacterEditor] = useState(false)
  const [showQuestForm, setShowQuestForm] = useState(false)
  const [toast, setToast] = useState('')
  const progress = xpProgress(data.xp)
  const activeQuests = data.quests.filter((quest) => quest.status === 'active')
  const completedToday = data.quests.filter((quest) => quest.status === 'completed' && quest.completedAt && new Date(quest.completedAt).toDateString() === new Date().toDateString()).length

  useEffect(() => { saveData(data) }, [data])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  function updateData(mutator: (current: AppData) => AppData, message?: string) {
    setData((current) => mutator(current))
    if (message) setToast(message)
  }

  function completeQuest(quest: Quest) {
    if (quest.status === 'completed') return
    updateData((current) => ({
      ...current,
      xp: current.xp + quest.xp,
      quests: current.quests.map((item) => item.id === quest.id ? { ...item, status: 'completed', completedAt: new Date().toISOString() } : item),
      logs: [{ id: makeId('log'), text: `完成了任务「${quest.title}」`, xp: quest.xp, kind: 'quest', createdAt: new Date().toISOString() }, ...current.logs],
    }), `+${quest.xp} XP · 任务完成`)
  }

  function updateCapital(key: CapitalKey, value: number) {
    updateData((current) => ({ ...current, capitals: { ...current.capitals, [key]: value } }))
  }

  function updatePsyche(key: 'mood' | 'energy' | 'stress', value: number) {
    updateData((current) => ({ ...current, psyche: { ...current.psyche, [key]: value } }))
  }

  function addQuest(title: string, description: string, type: QuestType, xp: number) {
    updateData((current) => ({
      ...current,
      quests: [{ id: makeId('quest'), title, description, type, xp, status: 'active', createdAt: new Date().toISOString() }, ...current.quests],
      logs: [{ id: makeId('log'), text: `建立了${type === 'main' ? '主线' : '支线'}「${title}」`, kind: 'system', createdAt: new Date().toISOString() }, ...current.logs],
    }), '新任务已加入冒险日志')
    setShowQuestForm(false)
  }

  function addLog(text: string) {
    if (!text.trim()) return
    updateData((current) => ({ ...current, logs: [{ id: makeId('log'), text: text.trim(), kind: 'note', createdAt: new Date().toISOString() }, ...current.logs] }), '日志已记录')
  }

  function handleReset() {
    if (window.confirm('确定要重置本地存档吗？这会清除当前设备上的所有 Life RPG 数据。')) setData(resetData())
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f6f8fb]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-amber-300 shadow-lg shadow-slate-900/10"><Sparkles size={19} /></div>
            <div><p className="text-sm font-bold tracking-tight">LIFE RPG</p><p className="text-[11px] text-slate-500">人生 · 你的长期游戏</p></div>
          </div>
          <div className="flex items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline">本地存档 · 自动保存</span><button onClick={handleReset} className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700" title="重置存档"><RotateCcw size={16} /></button><div className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">{data.character.name.slice(0, 1)}</div></div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-7 lg:px-8 lg:py-10">
        <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-7 text-white shadow-xl shadow-slate-900/10 sm:p-9">
            <div className="absolute -right-8 -top-12 h-52 w-52 rounded-full bg-amber-300/15 blur-2xl" />
            <div className="relative"><p className="mb-3 text-sm text-slate-300">早上好，{data.character.name} <span className="text-amber-300">✦</span></p><h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">今天也把生活<br /><span className="text-amber-300">玩出一点经验值。</span></h1><p className="mt-4 max-w-md text-sm leading-6 text-slate-300">{data.character.motto}</p><button onClick={() => setShowCharacterEditor(true)} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"><Pencil size={15} /> 编辑角色</button></div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">当前等级</p><div className="mt-2 flex items-baseline gap-3"><span className="text-5xl font-bold tracking-tight text-slate-900">{progress.level}</span><span className="text-sm font-medium text-amber-600">{data.character.title}</span></div></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Trophy size={21} /></div></div><div className="mt-7 flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">{progress.current} / {progress.needed} XP</span><span className="text-slate-400">下一级 · Lv {progress.level + 1}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500" style={{ width: `${progress.percent}%` }} /></div><div className="mt-5 grid grid-cols-2 gap-3"><MiniStat icon={<Target size={15} />} label="今日完成" value={`${completedToday} 件`} /><MiniStat icon={<Zap size={15} />} label="总经验" value={`${data.xp} XP`} /></div></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6"><SectionHeading icon={<Compass size={18} />} title="今天的冒险" action={<button onClick={() => setShowQuestForm(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"><Plus size={14} /> 新任务</button>} /><div className="space-y-3">{activeQuests.length ? activeQuests.map((quest) => <QuestCard key={quest.id} quest={quest} onComplete={() => completeQuest(quest)} />) : <EmptyState onAdd={() => setShowQuestForm(true)} />}</div><QuickLog onAdd={addLog} /></div>
          <div className="space-y-6"><SectionHeading icon={<HeartPulse size={18} />} title="角色状态" /><PsycheCard psyche={data.psyche} onChange={updatePsyche} /><SectionHeading icon={<Wallet size={18} />} title="五维资本" /><CapitalCard capitals={data.capitals} onChange={updateCapital} /></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]"><div><SectionHeading icon={<History size={18} />} title="冒险日志" action={<span className="text-xs text-slate-400">最近活动</span>} /><ActivityLog logs={data.logs} /></div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-900">今日提示</p><p className="mt-1 text-xs text-slate-500">给未来的自己留下一点线索</p></div><div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-50 text-violet-500"><Moon size={18} /></div></div><p className="mt-6 text-lg font-medium leading-8 text-slate-700">“真正的升级，不是做更多，<br />而是更清楚什么值得做。”</p><div className="mt-6 flex items-center gap-2 text-xs text-slate-400"><Activity size={14} /> 保持节奏，经验会自己累积</div></div></section>
      </main>
      {showCharacterEditor && <CharacterEditor character={data.character} onClose={() => setShowCharacterEditor(false)} onSave={(character) => { updateData((current) => ({ ...current, character }), '角色资料已更新'); setShowCharacterEditor(false) }} />}
      {showQuestForm && <QuestForm onClose={() => setShowQuestForm(false)} onSave={addQuest} />}
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>}
    </div>
  )
}

function SectionHeading({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) { return <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><span className="text-amber-500">{icon}</span>{title}</h2>{action}</div> }
function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-slate-400">{icon}<span className="text-[11px]">{label}</span></div><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div> }
function QuestCard({ quest, onComplete }: { quest: Quest; onComplete: () => void }) { return <div className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><button onClick={onComplete} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-slate-200 text-transparent transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-500" aria-label={`完成 ${quest.title}`}><Check size={17} strokeWidth={2.5} /></button><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${quest.type === 'main' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{quest.type === 'main' ? '主线' : '支线'}</span><span className="text-[11px] text-slate-400">+{quest.xp} XP</span></div><h3 className="mt-1 truncate text-sm font-semibold text-slate-800">{quest.title}</h3>{quest.description && <p className="mt-0.5 truncate text-xs text-slate-400">{quest.description}</p>}</div><ChevronRight className="text-slate-300 transition group-hover:translate-x-0.5" size={17} /></div> }
function EmptyState({ onAdd }: { onAdd: () => void }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="text-sm font-semibold text-slate-700">今天的任务都完成了</p><p className="mt-1 text-xs text-slate-400">为下一次冒险写一条新任务吧</p><button onClick={onAdd} className="mt-4 text-xs font-semibold text-amber-600 hover:text-amber-700">添加任务 <ArrowUpRight className="inline" size={13} /></button></div> }

function PsycheCard({ psyche, onChange }: { psyche: AppData['psyche']; onChange: (key: 'mood' | 'energy' | 'stress', value: number) => void }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid grid-cols-3 gap-3">{([['mood', '心情', psyche.mood, 'bg-amber-400'], ['energy', '能量', psyche.energy, 'bg-emerald-400'], ['stress', '压力', psyche.stress, 'bg-rose-400']] as const).map(([key, label, value, color]) => <label key={key} className="rounded-2xl bg-slate-50 p-3"><span className="flex items-center justify-between text-xs font-medium text-slate-500"><span>{label}</span><span className="font-bold text-slate-700">{value}</span></span><input aria-label={label} type="range" min="0" max="100" value={value} onChange={(event) => onChange(key, Number(event.target.value))} className={`mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full ${color}`} /></label>)}</div><div className="mt-4 rounded-2xl bg-amber-50/70 p-3.5"><p className="text-xs font-medium text-amber-800">今日状态 · {moodLabels[Math.min(3, Math.floor(psyche.mood / 25))]}</p><p className="mt-1 text-xs leading-5 text-amber-700/80">{psyche.note}</p></div></div> }

function CapitalCard({ capitals, onChange }: { capitals: AppData['capitals']; onChange: (key: CapitalKey, value: number) => void }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="space-y-4">{capitalKeys.map((key) => { const meta = capitalMeta[key]; return <label key={key} className="grid grid-cols-[1fr_auto] items-center gap-3"><span className="flex items-center gap-2 text-sm font-medium text-slate-700"><span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-50 text-xs">{meta.icon}</span>{meta.label}</span><span className={`text-xs font-bold ${meta.color}`}>{capitals[key]}</span><input aria-label={meta.label} type="range" min="0" max="100" value={capitals[key]} onChange={(event) => onChange(key, Number(event.target.value))} className="col-span-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-100 accent-slate-800" /></label> })}</div></div> }
function ActivityLog({ logs }: { logs: AppData['logs'] }) { return <div className="mt-3 divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white px-5 shadow-sm">{logs.slice(0, 5).map((log) => <div key={log.id} className="flex items-center gap-3 py-4"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${log.kind === 'quest' ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>{log.kind === 'quest' ? <Check size={15} /> : <Activity size={15} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm text-slate-700">{log.text}</p><p className="mt-0.5 text-[11px] text-slate-400">{relativeTime(log.createdAt)}</p></div>{log.xp && <span className="text-xs font-bold text-amber-600">+{log.xp} XP</span>}</div>)}</div> }

function QuickLog({ onAdd }: { onAdd: (text: string) => void }) { const [text, setText] = useState(''); return <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); onAdd(text); setText('') }}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="记录一个想法、感受或小胜利…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100" /><button className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-900 hover:text-white" aria-label="保存日志"><Save size={16} /></button></form> }

function CharacterEditor({ character, onClose, onSave }: { character: AppData['character']; onClose: () => void; onSave: (character: AppData['character']) => void }) { const [draft, setDraft] = useState(character); return <Modal title="编辑角色" onClose={onClose}><div className="space-y-4"><Field label="名字" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} /><Field label="称号" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} /><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">人生宣言</span><textarea value={draft.motto} onChange={(event) => setDraft({ ...draft, motto: event.target.value })} rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" /></label></div><ModalActions onClose={onClose} onSave={() => onSave({ name: draft.name.trim() || '冒险者', title: draft.title.trim() || '正在升级的人类', motto: draft.motto.trim() || '把今天过成值得记录的一天。' })} /></Modal> }
function QuestForm({ onClose, onSave }: { onClose: () => void; onSave: (title: string, description: string, type: QuestType, xp: number) => void }) { const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [type, setType] = useState<QuestType>('main'); const [xp, setXp] = useState(50); return <Modal title="开启新任务" onClose={onClose}><div className="space-y-4"><Field label="任务名称" value={title} onChange={setTitle} placeholder="例如：完成提案初稿" /><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">一句描述 <span className="font-normal text-slate-400">（可选）</span></span><input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" placeholder="为什么值得做？" /></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">类型</span><select value={type} onChange={(event) => setType(event.target.value as QuestType)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"><option value="main">主线</option><option value="side">支线</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">奖励 XP</span><input type="number" min="5" max="500" step="5" value={xp} onChange={(event) => setXp(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-400" /></label></div></div><ModalActions onClose={onClose} saveLabel="创建任务" onSave={() => title.trim() && onSave(title.trim(), description.trim(), type, Math.max(5, xp || 5))} /></Modal> }
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" /></label> }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/35 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭"><X size={18} /></button></div>{children}</div></div> }
function ModalActions({ onClose, onSave, saveLabel = '保存变更' }: { onClose: () => void; onSave: () => void; saveLabel?: string }) { return <div className="mt-7 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100">取消</button><button onClick={onSave} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">{saveLabel}</button></div> }

export default App
