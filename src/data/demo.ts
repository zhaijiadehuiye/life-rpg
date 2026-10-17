// Demo 数据：让用户第一次打开就能看到完整产品形态。
import type {
  Achievement, DailyLog, DailyQuest, GameState, MainQuest, MentalState,
  RandomEvent, SideQuest, Skill, StatusEffect, UserProfile, TimeCategory, TimeEntry,
} from '../types'
import { uuid } from '../utils/id'
import { todayKey, addDays } from '../utils/date'
import { buildDefaultCapitals, DEFAULT_ACHIEVEMENTS, DEFAULT_DOMAINS, DEFAULT_MAP_NODES } from './constants'
import { levelFromTotalXp } from '../utils/xp'
import { timestampFromLocal } from '../lib/dailyTime'

export function buildDemoState(): GameState {
  const t = todayKey()

  const profile: UserProfile = {
    id: uuid(),
    name: '流浪者',
    createdAt: addDays(t, -45),
    lastActiveDate: t,
    totalXp: 19000,
    level: levelFromTotalXp(19000).level,
    streak: 6,
    longestStreak: 14,
    startedWithDemo: true,
  }

  const mental: MentalState = {
    date: t, energy: 62, focus: 58, stress: 64, mood: 65, selfEfficacy: 55, socialBattery: 48,
  }

  const capitals = buildDefaultCapitals({
    physical: 38, cultural: 52, economic: 30, social: 45, symbolic: 22, time: 35,
  })

  const skills: Skill[] = [
    mkSkill('英语', 'learn', 6, 1280),
    mkSkill('写作', 'creative', 4, 620),
    mkSkill('产品', 'career', 7, 1840),
    mkSkill('跑步', 'body', 3, 320),
    mkSkill('倾听', 'social', 2, 180),
  ]

  const mainQuests: MainQuest[] = [
    {
      id: uuid(), kind: 'main', title: '英语达到 B2',
      description: '能自由交流、读英文资料、写工作邮件。',
      domain: 'learn', startDate: addDays(t, -30), targetDate: addDays(t, 180),
      difficulty: 'hard', status: 'active', createdAt: addDays(t, -30),
      milestones: [
        { id: uuid(), title: 'A2 → B1', completed: true, completedAt: addDays(t, -20) },
        { id: uuid(), title: '累计 100 小时学习', completed: false },
        { id: uuid(), title: '完成第一次完整英语交流', completed: false },
        { id: uuid(), title: '通过一次模拟测试', completed: false },
        { id: uuid(), title: '达到 B2', completed: false },
      ],
    },
    {
      id: uuid(), kind: 'main', title: '完成第一个独立产品',
      description: '从想法到上线，跑通一次完整闭环。',
      domain: 'create', startDate: addDays(t, -15), difficulty: 'epic',
      status: 'active', createdAt: addDays(t, -15),
      milestones: [
        { id: uuid(), title: '写 PRD 与核心场景', completed: true, completedAt: addDays(t, -10) },
        { id: uuid(), title: '做出可用原型', completed: false },
        { id: uuid(), title: '找 3 个用户试用', completed: false },
        { id: uuid(), title: '公开发布', completed: false },
      ],
    },
    {
      id: uuid(), kind: 'main', title: '建立 3 个月生活费的缓冲',
      description: '不依赖工资也能撑 3 个月，降低决策焦虑。',
      domain: 'money', startDate: addDays(t, -60), targetDate: addDays(t, 90),
      difficulty: 'hard', status: 'active', createdAt: addDays(t, -60),
      milestones: [
        { id: uuid(), title: '算出每月必需开支', completed: true, completedAt: addDays(t, -50) },
        { id: uuid(), title: '存到 1 个月', completed: true, completedAt: addDays(t, -20) },
        { id: uuid(), title: '存到 2 个月', completed: false },
        { id: uuid(), title: '存到 3 个月', completed: false },
      ],
    },
  ]

  const sideQuests: SideQuest[] = [
    { id: uuid(), kind: 'side', title: '英语学习 45 分钟', description: '精读一段材料 + 跟读。', difficulty: 'normal', xpReward: 25, capitalKey: 'cultural', skillId: skills[0].id, minutes: 45, completed: false, createdAt: t },
    { id: uuid(), kind: 'side', title: '写 300 字产品原型笔记', description: '把今天的想法写下来。', difficulty: 'normal', xpReward: 30, capitalKey: 'symbolic', skillId: skills[2].id, minutes: 30, completed: false, createdAt: t },
    { id: uuid(), kind: 'side', title: '给一个老朋友发消息', description: '不用长，一句也行。', difficulty: 'easy', xpReward: 10, capitalKey: 'social', minutes: 5, completed: true, completedAt: t, createdAt: addDays(t, -1) },
  ]

  const dailyQuests: DailyQuest[] = [
    { id: uuid(), kind: 'daily', title: '睡眠 ≥ 7 小时', description: '今晚 23:30 前躺下。', difficulty: 'easy', xpReward: 10, capitalKey: 'physical', createdAt: addDays(t, -7) },
    { id: uuid(), kind: 'daily', title: '运动 30 分钟', description: '跑步或力量训练。', difficulty: 'normal', xpReward: 20, capitalKey: 'physical', skillId: skills[3].id, minutes: 30, createdAt: addDays(t, -7) },
    { id: uuid(), kind: 'daily', title: '记录支出', description: '打开记账软件记一笔。', difficulty: 'easy', xpReward: 5, capitalKey: 'economic', createdAt: addDays(t, -7) },
  ]

  const randomEvents: RandomEvent[] = [
    { id: uuid(), kind: 'event', title: '朋友邀请你参加周末聚会', description: '可能认识新朋友，也可能消耗社交电量。', createdAt: addDays(t, -1), status: 'pending' },
  ]

  const effects: StatusEffect[] = [
    { id: uuid(), name: '连续行动', description: '已连续推进，状态在累积。', icon: 'flame', type: 'buff', source: 'derived' },
  ]

  const logs: DailyLog[] = []
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i)
    logs.push({
      date: d,
      whatHappened: i === 0 ? '今天先把原型的首页画出来了。' : '按计划推进了英语和产品笔记。',
      bestThing: i === 2 ? '和老朋友聊了半小时，很放松。' : '完成了当天最重要的一件事。',
      biggestDifficulty: '下午注意力散，刷了 40 分钟手机。',
      didRight: '早上先做了最难的那一步。',
      tomorrowPriority: '把原型的核心交互跑通。',
      tasksCompleted: i === 0 ? 2 : 3,
      xpEarned: i === 0 ? 55 : 70 + i * 5,
      ...(i === 0 ? { dayRating: 8, meals: '早餐：鸡蛋、牛奶；午餐：米饭、青菜；晚餐：面条', exerciseDone: true, exerciseNote: '晚饭后散步', whatHappened: '推进产品原型，读了一会儿书，傍晚散步。' } : {}),
    })
  }

  const achievements: Achievement[] = DEFAULT_ACHIEVEMENTS.map((a) => {
    if (a.id === 'first-step') return { ...a, progress: 1, unlockedAt: addDays(t, -45) }
    if (a.id === 'first-quest') return { ...a, progress: 1, unlockedAt: addDays(t, -44) }
    if (a.id === 'streak-7') return { ...a, progress: 6 }
    if (a.id === 'learn-10h') return { ...a, progress: 420 }
    if (a.id === 'journal-7') return { ...a, progress: 5 }
    return { ...a, progress: 0 }
  })

  const domains = DEFAULT_DOMAINS.map((d) => ({
    ...d,
    selected: ['health', 'learn', 'career'].includes(d.key),
  }))

  return {
    initialized: true, profile, mental, capitals, skills, mainQuests, sideQuests,
    dailyQuests, randomEvents, effects, logs, domains, achievements,
    transactions: [], mapNodes: DEFAULT_MAP_NODES, timeEntries: demoTimeEntries(t),
    checkIns: {}, dailyActions: [], actionLogs: [], settlements: [],
  }
}

// Explicit example mode only. Never add sample records when loading a real save.
function demoTimeEntries(today: string): TimeEntry[] {
  const now = new Date().toISOString()
  const result: TimeEntry[] = []
  const add = (category: TimeCategory, startedAt: string, endedAt: string, note = '') => {
    if (Date.parse(endedAt) > Date.now()) return
    result.push({ id: uuid(), category, startedAt, endedAt, note, createdAt: now, updatedAt: now })
  }
  ;[410, 440, 480, null, 430, 400, 460].forEach((minutes, index) => {
    if (minutes === null) return
    const date = addDays(today, index - 6)
    const end = timestampFromLocal(date, '07:50')!
    add('sleep', new Date(Date.parse(end) - minutes * 60_000).toISOString(), end, '虚构示例：睡眠')
  })
  const activities: [TimeCategory, string, string][] = [
    ['other', '08:00', '08:30'], ['work', '09:00', '12:00'], ['other', '12:00', '13:00'],
    ['work', '13:00', '16:00'], ['study', '16:15', '17:45'], ['exercise', '18:30', '18:50'], ['rest', '20:00', '22:00'],
  ]
  activities.forEach(([category, start, end]) => add(category, timestampFromLocal(today, start)!, timestampFromLocal(today, end)!, '虚构示例'))
  return result
}

function mkSkill(name: string, category: string, level: number, xp: number): Skill {
  const xpToNext = Math.floor(60 * Math.pow(level, 1.3))
  return {
    id: uuid(), name, category, level, xp, xpToNext,
    totalMinutes: Math.floor(xp / 2),
    createdAt: addDays(todayKey(), -40),
  }
}
