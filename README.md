# Life RPG · 人生游戏化操作系统

把现实中的个人成长、资源积累、心理状态和人生目标，转换成 RPG 中的角色属性、资本、Buff/Debuff、主线、支线、经验值与成就，并形成“每日状态 → 今日行动 → 角色成长 → 每日结算 → 历史趋势”的闭环。

**它不是 Todo List，也不是习惯打卡软件。** 你在现实中完成真正有价值的行动，游戏角色才成长。

---

## 快速开始

```bash
pnpm install        # 或 npm install
pnpm dev            # 启动开发服务器（默认 http://localhost:5173）
pnpm build          # 类型检查 + 生产构建，产物在 dist/
pnpm preview        # 本地预览构建产物
```

> 依赖：Node.js ≥ 18。首次启动选择「先看 Demo 角色」即可立刻看到完整效果。

## 在线使用

公开站点（无需登录）：

**https://life-rpg.tzxbss.chatgpt.site**

项目同时保留 `.github/workflows/deploy-pages.yml`，方便在仓库设置启用 GitHub Pages 后继续使用 GitHub 原生发布。生产构建使用相对资源路径和 HashRouter，可在静态子路径刷新和离线打开。

---

## 技术栈

- **React 18 + TypeScript**（strict 模式）
- **Vite 5** 构建（`base: './'`，可部署到任意静态托管）
- **Tailwind CSS 3** 样式
- **Zustand 5** 状态管理（单一 store，自动持久化）
- **react-router-dom 6**（HashRouter，适合静态托管）
- **lucide-react** 图标

无后端、无登录、无支付、无 AI。所有数据保存在浏览器本地。

---

## 项目结构

```
src/
├── main.tsx                 # 入口
├── App.tsx                  # 路由 + onboarding 闸门
├── index.css                # Tailwind + 设计变量
├── types/index.ts           # 全部 TypeScript 数据模型
├── utils/
│   ├── id.ts                # UUID v4
│   ├── date.ts              # 日期 key / 天数差
│   ├── xp.ts                # ★ XP 与等级曲线
│   └── performance.ts       # ★ 当前发挥率公式
├── data/
│   ├── constants.ts         # 六大资本 / 领域 / 成就 / 地图节点 / 事件池
│   ├── dailyRules.ts        # Check-in → 三个关键行动 → 每日结算规则
│   └── demo.ts              # Demo 角色工厂
├── services/
│   └── storage.ts           # 兼容入口
├── lib/
│   ├── storage.ts           # ★ 持久化层与 schema 迁移
│   └── cloud.ts             # Supabase SyncStore 接口边界
├── store/
│   └── useGameStore.ts      # ★ Zustand 仓库：所有业务动作
├── components/              # 通用 UI
└── pages/                   # 11 个页面
```

---

## 数据存储方式

- 当前实现：**localStorage**，key = `life-rpg:v1`，存档 payload schema 已升级到 v2。
- 持久化层封装在 `src/lib/storage.ts`，`src/services/storage.ts` 保留兼容入口，只暴露 `loadState()` / `saveState(state)`。
- 每次 store 修改后都会自动保存，刷新不丢；v1 存档会在读取和导入时补齐 v2 字段。
- 「设置」页支持：**导出 JSON 备份**、**导入 JSON 恢复**、**清空数据重新开始**。
- 首页每日 Check-in 会根据规则生成 3 个关键行动；完成后同时写入角色 XP、资本/技能 XP、streak 和行动日志。

## 每日闭环

Check-in 的六项状态会影响规则引擎选择的行动：睡眠不足或精力低时优先恢复，压力高时先清空压力回路，专注或自我效能低时降低启动门槛，其余时间优先推进主线和积累知识资产。统计页提供最近 7 天 XP、完成率、睡眠与主线推进周报。

## PWA 与同步边界

生产构建包含 manifest、service worker、PNG/SVG 图标和移动端 standalone 配置。Supabase 接入预留在 `src/lib/cloud.ts` 的 `SyncStore` 接口中，当前 localStorage 仍是唯一真实数据源。

---

## XP 系统（全部在 `src/utils/xp.ts`）

- 角色升级：`xpToNextLevel(level) = floor(100 * level^1.5)`。前期快、后期慢。
- **等级永不下降**。断签只暂停 streak，不掉级、不清空累计 XP。
- 难度预设：easy 5–15 / normal 20–40 / hard 50–100 / epic 100–500 XP。
- 防刷：角色 XP 每日硬上限 300 XP；日常每天只奖一次。
- 资本/技能用内部 XP 缓慢成长：资本每点 `floor(80+level*40)`，技能每级 `floor(60*level^1.3)`。

## 当前发挥率（`src/utils/performance.ts`）

```
performance = energy*0.25 + focus*0.25 + mood*0.15
            + selfEfficacy*0.15 + (100 - stress)*0.20
```

UI 明确标注"游戏化参考值，非医学/心理学测量"。调权重只改 `WEIGHTS`。

---

## 如何扩展

- **新资本**：`types/index.ts` 加 `CapitalKey`；`data/constants.ts` 加 `CAPITAL_META`。
- **新技能分类**：编辑 `SKILL_CATEGORIES`。
- **新任务类型**：types 加 interface → store 加 action（复用 `applyRewards`）→ Quests 页加分区。
- **新成就**：`DEFAULT_ACHIEVEMENTS` 加条目，并在 reward 函数里更新 progress。

## 下一步：接 Supabase

1. `pnpm add @supabase/supabase-js`。
2. 新建 `services/supabase.ts`，实现与 `storage.ts` 相同签名。
3. `hydrate` 先读本地（秒开），再异步拉 Supabase 合并。
4. 用 `profile.id` 作主键，把各集合拆表、带 `user_id`。

## 下一步：接 AI

1. 新建 `services/ai.ts` 的 `generateEvent(context)`。
2. context 传心理状态、最近主线、近 3 天日志摘要。
3. `newRandomEvent` 先调 AI，失败 fallback 本地事件池。

---

## 心理安全设计

- 状态差时文案是"系统处于高负载，建议降低任务复杂度"，不出现"失败/懒惰/落后"。
- 等级永不下降；断签只暂停 streak，保留 longestStreak。
- 所有资本值都标注"自我追踪工具，不是人的价值评分"。
