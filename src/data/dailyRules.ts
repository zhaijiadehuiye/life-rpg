import type { CapitalKey, DailyAction, DailyCheckIn, DailySettlement, GameState } from '../types'
import { todayKey, dateKeyFromTimestamp } from '../utils/date'

type ActionSeed = Pick<DailyAction, 'title' | 'description' | 'xpReward' | 'capitalKey' | 'skillId' | 'minutes' | 'mainQuestId' | 'milestoneId'>

export function generateDailyActions(state: GameState, checkIn: DailyCheckIn): DailyAction[] {
  const date = checkIn.date
  const main = state.mainQuests.find((quest) => quest.status === 'active')
  const nextMilestone = main?.milestones.find((milestone) => !milestone.completed)
  const actions: ActionSeed[] = []
  if (main) {
    actions.push({ title: `推进主线：${main.title}`, description: nextMilestone ? `把「${nextMilestone.title}」拆成一个 25 分钟内能开始的下一步。` : '把主线拆成一个 25 分钟内能开始的下一步。', xpReward: 50, capitalKey: 'time', skillId: firstSkill(state), minutes: 25, mainQuestId: main.id, milestoneId: nextMilestone?.id })
  }
  if (checkIn.sleep < 6 || checkIn.energy < 45) {
    actions.push({ title: '先恢复，再输出', description: '安排一次 20 分钟散步或短休息，让身体回到可行动状态。', xpReward: 30, capitalKey: 'physical', skillId: skillForCategory(state, 'body'), minutes: 20 })
  } else if (checkIn.focus < 50) {
    actions.push({ title: '降低启动门槛', description: '把最重要的任务缩小成 5 分钟版本，先获得一次开始的证据。', xpReward: 25, capitalKey: 'time', skillId: firstSkill(state), minutes: 5 })
  } else {
    actions.push({ title: '完成一段深度专注', description: '关掉通知，给最重要的事情一个完整的 25 分钟。', xpReward: 40, capitalKey: 'time', skillId: firstSkill(state), minutes: 25 })
  }
  if (checkIn.stress > 65) {
    actions.push({ title: '清空一个压力回路', description: '写下脑中最吵的一件事，并决定下一步或明确放下它。', xpReward: 25, capitalKey: 'physical', skillId: skillForCategory(state, 'body'), minutes: 10 })
  } else if (checkIn.selfEfficacy < 50) {
    actions.push({ title: '完成一件小而确定的事', description: '选择一个 10 分钟内可以完成的动作，重新建立自我效能。', xpReward: 25, capitalKey: 'time', skillId: firstSkill(state), minutes: 10 })
  } else if (checkIn.mood < 45) {
    actions.push({ title: '补充一次真实连接', description: '给一个让你安心的人发消息，或安排下一次见面。', xpReward: 25, capitalKey: 'social', skillId: skillForCategory(state, 'social'), minutes: 10 })
  } else {
    actions.push({ title: '给未来的自己留资产', description: '学习、整理或记录一个下周可以复用的小成果。', xpReward: 30, capitalKey: 'cultural', skillId: skillForCategory(state, 'learn'), minutes: 20 })
  }
  while (actions.length < 3) actions.push({ title: '收尾并留下线索', description: '在结束工作前写三行记录，让明天可以无缝接续。', xpReward: 20, capitalKey: 'symbolic', skillId: firstSkill(state), minutes: 5 })
  return actions.slice(0, 3).map((action, index) => ({ ...action, id: `${date}-action-${index + 1}`, date, status: 'available', source: 'rule' as const }))
}

export function calculateDailySettlement(state: GameState, date = todayKey()): DailySettlement {
  const actions = (state.dailyActions ?? []).filter((action) => action.date === date)
  const completedActions = actions.filter((action) => action.status === 'completed').length
  const completedQuests = state.dailyQuests.filter((quest) => quest.lastCompletedDate === date).length + state.sideQuests.filter((quest) => quest.completedAt === date).length
  const total = Math.max(1, actions.length + state.dailyQuests.length + state.sideQuests.length)
  const transactions = state.transactions.filter((transaction) => dateKeyFromTimestamp(transaction.timestamp) === date && transaction.kind === 'character')
  const capitalTransactions = state.transactions.filter((transaction) => dateKeyFromTimestamp(transaction.timestamp) === date && transaction.kind === 'capital')
  const skillTransactions = state.transactions.filter((transaction) => dateKeyFromTimestamp(transaction.timestamp) === date && transaction.kind === 'skill')
  const completedMain = state.mainQuests.reduce((sum, quest) => sum + quest.milestones.filter((milestone) => milestone.completedAt === date).length, 0)
  const mainTotal = Math.max(1, state.mainQuests.reduce((sum, quest) => sum + quest.milestones.length, 0))
  return {
    date,
    completionRate: Math.min(100, Math.round(((completedActions + completedQuests) / total) * 100)),
    xpEarned: transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    capitalXp: capitalTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    skillXp: skillTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    mainlineProgress: Math.round((completedMain / mainTotal) * 100),
    createdAt: new Date().toISOString(),
  }
}

function firstSkill(state: GameState): string | undefined { return state.skills[0]?.id }
function skillForCategory(state: GameState, category: string): string | undefined { return state.skills.find((skill) => skill.category === category)?.id ?? firstSkill(state) }

export const CAPITAL_LABELS: Record<CapitalKey, string> = { physical: '身体资本', cultural: '文化资本', economic: '经济资本', social: '社会资本', symbolic: '象征资本', time: '时间资本' }
