# Life OS v0.6 · 人生操作系统

给自己使用的生活记录与行动工具：记录睡眠和日常、安排小事、回看经历，按需要整理想法和尝试改变。成长、技能和经验是可选的辅助视角。

不强制打卡，休息或漏记不会扣减已有经验。[中文使用说明](docs/user-guide-zh.md)。

## 统一的 Life OS 界面

- **使用引导**：桌面左侧第一项、手机顶部和「更多」均可进入，支持四步实际页面操作引导。
- **今天**：生活看板与今日任务；原有任务、技能、经验和资本规则保持不变。
- **每日记录**：每日总结与随手记；随手记支持多条原文和追加修订。
- **历史记录**：一起回看每日总结和随手记，支持日期筛选与搜索。
- **复盘与探索**：回看线索、想法与证据、小实验、我的预测、定期复盘。
- **设置与备份**：整站 JSON 导出、记录档案的预览去重导入，以及本机快照。

自我历史学的八个功能已接入 React 主应用，共用侧栏、卡片、表单与弹窗，主界面不再嵌 iframe。`/#/historian` 兼容跳转到随手记，旧 `personal-historian/` 静态页面继续保留。两套存档仍在原 localStorage / IndexedDB，不自动迁移或清空真实数据。不同域名需显式导出 / 导入。[原生整合、兼容性与验收截图](docs/native-research-integration.md)。

「今天」增加生活看板：睡眠起止与时长、每日自评分、活动时间分布、近 7 天睡眠和当天日记摘要。首页与每日记录共用时段数据，可补记、修改和离线保存，不会自动完成任务或增加经验。[操作说明、统计口径与验收](docs/today-life-dashboard.md)。

`pnpm build` 自动包含旧 Historian 静态资源和全部构建资源的离线预缓存；首次在线加载并完成 service worker 安装后，可离线使用原生页面与兼容入口。未保存的草稿离开页面后不会保留。[未来数据适配与迁移设计](docs/life-os-v0.6-design.md)。

---

## 快速开始

```bash
pnpm install        # 或 npm install
pnpm dev            # 启动开发服务器（默认 http://localhost:5173）
pnpm build          # 类型检查 + 生产构建，产物在 dist/
pnpm preview        # 本地预览构建产物
```

> 依赖：Node.js 24（与 CI 一致），pnpm 9。首次启动可选择「载入示例数据」查看效果，或创建自己的档案。已有记录时请继续使用原档案。

## 在线使用

公开站点（无需登录）：

**https://life-rpg.tzxbss.chatgpt.site**

GitHub Pages：

**https://zhaijiadehuiye.github.io/life-rpg/**

Personal Historian / 自我历史学的 GitHub Pages：

**https://zhaijiadehuiye.github.io/life-rpg/personal-historian/**

Personal Historian 源码位于 `personal-historian/`，由同一个 Pages 工作流一起发布。项目同时保留 `.github/workflows/deploy-pages.yml`，方便在仓库设置启用 GitHub Pages 后继续使用 GitHub 原生发布。生产构建使用相对资源路径和 HashRouter，可在静态子路径刷新和离线打开。

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

- 当前实现：**localStorage**，key = `life-rpg:v1`，存档 payload schema 已升级到 v3，新增 `timeEntries` 时段集合。
- 持久化层封装在 `src/lib/storage.ts`，`src/services/storage.ts` 保留兼容入口，只暴露 `loadState()` / `saveState(state)`。
- v1/v2 存档读取时只在内存补齐集合，不自动改写存档，也不改写原日志和 Check-in。睡眠时段缺失时可显示旧版自报时长；只有醒来时间时不倒推出入睡时间。
- 「设置」页支持：**导出 JSON 备份**、**导入 JSON 恢复**、**清空数据重新开始**。
- 首页每日 Check-in 会根据规则生成 3 个关键行动；完成后同时写入角色 XP、资本/技能 XP、streak 和行动日志。

## 每日闭环

Check-in 的六项状态会影响规则引擎选择的行动：睡眠不足或精力低时优先恢复，压力高时先清空压力回路，专注或自我效能低时降低启动门槛，其余时间优先推进主线和积累知识资产。统计页提供最近 7 天 XP、完成率、睡眠与主线推进周报。

## PWA 与同步边界

生产构建包含 manifest、service worker、PNG/SVG 图标和移动端 standalone 配置。Supabase 接入预留在 `src/lib/cloud.ts` 的 `SyncStore` 接口中，Life RPG 的 localStorage 仍是其真实数据源，自我历史学沿用 IndexedDB。

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

Pull request previews are published under `/previews/pr-<number>/` after the Pages workflow completes. They use an isolated service-worker scope; the workflow rebuilds the current `main` root unchanged and removes the preview when its pull request closes. The branch preview is public and uses the same GitHub Pages origin as the production app, so the browser's existing app storage is shared.
