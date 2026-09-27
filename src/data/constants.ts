// 内置常量：资本 / 领域 / 成就 / 地图节点 / 技能分类
import type { Achievement, Capital, CapitalKey, LifeDomain, MapNode } from '../types'
import { uuid } from '../utils/id'

export const CAPITAL_META: Record<CapitalKey, { name: string; hint: string }> = {
  physical: { name: '身体资本', hint: '健康、体能、睡眠、外貌维护' },
  cultural: { name: '文化资本', hint: '学历、技能、语言、知识、审美' },
  economic: { name: '经济资本', hint: '收入、储蓄、资产、财务安全' },
  social: { name: '社会资本', hint: '朋友、合作关系、社会支持' },
  symbolic: { name: '象征资本', hint: '作品、声望、职业身份、个人品牌' },
  time: { name: '时间资本', hint: '可自由支配时间与长期复利空间' },
}

export function buildDefaultCapitals(selfRatings?: Partial<Record<CapitalKey, number>>): Capital[] {
  return (Object.keys(CAPITAL_META) as CapitalKey[]).map((key) => {
    const level = Math.max(0, Math.min(100, selfRatings?.[key] ?? 20))
    return { key, name: CAPITAL_META[key].name, level, xp: 0, xpToNext: Math.floor(80 + level * 40) }
  })
}

export const DEFAULT_DOMAINS: LifeDomain[] = [
  { key: 'health', name: '健康', importance: 80, satisfaction: 50, investment: 40, selected: false },
  { key: 'learn', name: '学习', importance: 70, satisfaction: 50, investment: 50, selected: false },
  { key: 'career', name: '事业', importance: 80, satisfaction: 45, investment: 60, selected: false },
  { key: 'money', name: '经济', importance: 75, satisfaction: 40, investment: 40, selected: false },
  { key: 'social', name: '社交', importance: 60, satisfaction: 50, investment: 30, selected: false },
  { key: 'love', name: '爱情', importance: 50, satisfaction: 50, investment: 20, selected: false },
  { key: 'family', name: '家庭', importance: 60, satisfaction: 60, investment: 30, selected: false },
  { key: 'create', name: '创造', importance: 65, satisfaction: 45, investment: 35, selected: false },
  { key: 'fun', name: '娱乐', importance: 40, satisfaction: 55, investment: 25, selected: false },
]

export const SKILL_CATEGORIES: { key: string; label: string }[] = [
  { key: 'body', label: '身体' },
  { key: 'learn', label: '学习' },
  { key: 'career', label: '职业' },
  { key: 'social', label: '社交' },
  { key: 'creative', label: '创造' },
]

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-step', name: '游戏开始', description: '完成第一次记录。', icon: 'play', target: 1, progress: 0 },
  { id: 'first-quest', name: '第一步', description: '完成第一个任务。', icon: 'footprints', target: 1, progress: 0 },
  { id: 'streak-7', name: '持续行动', description: '连续 7 天每天完成至少一个任务。', icon: 'flame', target: 7, progress: 0 },
  { id: 'streak-30', name: '一个月', description: '连续使用 30 天。', icon: 'calendar-check', target: 30, progress: 0 },
  { id: 'learn-10h', name: '学习者', description: '累计学习/投入 10 小时。', icon: 'book-open', target: 600, progress: 0 },
  { id: 'first-work', name: '作品出现', description: '完成第一个个人项目（里程碑任务）。', icon: 'gem', target: 1, progress: 0 },
  { id: 'econ-buffer', name: '经济缓冲', description: '第一次达到自定义储蓄目标。', icon: 'piggy-bank', target: 1, progress: 0 },
  { id: 'journal-7', name: '自我观察', description: '连续写 7 天日志。', icon: 'notebook-pen', target: 7, progress: 0 },
]

export const DEFAULT_MAP_NODES: MapNode[] = [
  { id: 'survive', title: '生存稳定', subtitle: '住所 · 收入 · 安全', status: 'completed', x: 50, y: 8 },
  { id: 'health', title: '身体健康', subtitle: '睡眠 · 体能 · 饮食', status: 'available', x: 22, y: 28 },
  { id: 'economy', title: '经济安全', subtitle: '储蓄 · 现金流', status: 'available', x: 50, y: 28 },
  { id: 'home', title: '稳定住所', subtitle: '基本生活秩序', status: 'available', x: 78, y: 28 },
  { id: 'growth', title: '能力成长', subtitle: '文化资本 · 职业技能', status: 'locked', x: 50, y: 50 },
  { id: 'people', title: '社会连接', subtitle: '朋友 · 合作 · 亲密关系', status: 'locked', x: 30, y: 72 },
  { id: 'create', title: '创造与事业', subtitle: '作品 · 事业 · 影响力', status: 'locked', x: 70, y: 72 },
]

export const RANDOM_EVENT_POOL = [
  { title: '朋友邀请你参加聚会', description: '周末有个线下小聚，可能认识新朋友。' },
  { title: '发现一门新课程', description: '你刷到一个和当前主线相关的课程。' },
  { title: '突然得到一个合作机会', description: '有人邀请你一起做个小项目。' },
  { title: '身体发出警告', description: '今天肩颈僵硬，提醒你该起身活动。' },
  { title: '读到一篇长文', description: '一篇深度文章正好回答了你最近的困惑。' },
  { title: '一个闲置已久的想法', description: '你突然想起半年前想做的那件事。' },
]

export function newEventFromPool() {
  const pick = RANDOM_EVENT_POOL[Math.floor(Math.random() * RANDOM_EVENT_POOL.length)]
  return {
    id: uuid(), kind: 'event' as const, title: pick.title, description: pick.description,
    createdAt: new Date().toISOString(), status: 'pending' as const,
  }
}
