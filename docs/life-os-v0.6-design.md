# Life OS v0.6：入口整合与下一阶段数据设计

## 本次交付边界

React 主应用保留 Life RPG 的全部任务、技能、经验与资本规则。`/#/historian` 在主导航内加载同源的 `personal-historian/index.html`，桌面侧栏、移动底栏、更多页和首页都有入口；无角色的用户也可直接进入自我历史学。八个研究视图全部保留，主导航显示中文。旧静态入口继续可用。

iframe 是**暂时的渐进集成方案**：隔离 CSS 与页面生命周期，避免重写研究工作区；它不是安全沙箱，同源脚本属于同一信任边界。保留同源和下载、IndexedDB 能力，不设会改变存储 origin 的 sandbox。没有 postMessage 数据桥，没有自动迁移、同步或分析回写 RPG。后续可逐视图抽离 UI，由适配器承担数据访问。

两套数据仍分别保存：Life RPG 的 `life-rpg:v1` localStorage（payload version 2）与 Historian 的 `personal-historian-db` IndexedDB（version 1，`workspace` store，`current` key）。Historian 在 IndexedDB 不可用时沿用 `personal-historian-db:current` localStorage 回退。此次不修改数据库名称、版本、存储函数、原文、revision 或奖励算法，也不读取任何真实个人数据。

同源包含协议、域名与端口，不包含路径。因此同一 GitHub Pages origin 下旧路径与 iframe 使用已有档案；`life-rpg.tzxbss.chatgpt.site` 与 `personal-historian.tzxbss.chatgpt.site` 的数据相互不可读取。localhost 测试也不能代表生产域名存档。不同 origin 必须由用户在源站显式导出、在目标站显式导入。GitHub Pages 同一域名下不同项目可能共用现有存储键，这是已有的 origin 隔离限制；本次不擅自改键。

## 现有模型梳理

| 来源 | 身份与字段 | 当前写入语义 | 统一记录需保留的信息 |
| --- | --- | --- | --- |
| RPG `DailyLog` / `logs` | `date`；whatHappened、bestThing、biggestDifficulty、didRight、tomorrowPriority；tasksCompleted、xpEarned | `writeLog` 按日期更新，现有模型没有 revision | 五段原文分别保留，统计数字不当作用户原文；旧修订不存在时不伪造 |
| RPG `DailyCheckIn` / `checkIns` | 日期、sleep 小时、energy/focus/mood/stress/selfEfficacy 0–100、note、createdAt | 按日替换，触发三项行动生成 | 状态测量的时间、单位与来源；note 是独立文本 |
| RPG 任务与行动 | mainQuests 的 milestones、sideQuests、dailyQuests；dailyActions 与 actionLogs；XP transactions、settlements | 用户完成动作产生奖励和日志 | 任务 ID、行动 ID、完成日期、交易引用；不得因导入重放奖励 |
| Historian `entries` | id、date、createdAt/updatedAt、originalText、currentText、revisions、tags、metadata | 新记录追加；用户编辑追加 revision | 初始原文及每次 revision 的 ID、时间、文本、kind、note，顺序不可丢失 |
| Historian 分析 | analysis 的 facts/interpretation/narrative/alternatives/cannotConclude、model、promptVersion、analyzedAt；events | 分析是独立派生层 | 引用具体 revision；不改写原文、revision 或其他模块状态 |
| Historian 研究集合 | hypotheses/confidenceHistory；evidence.entryId/hypothesisId；experiments/observations；predictions/result；reviews、backups | 各自维护证据与历史；备份是整体快照 | 全部引用、判断历史与实验观察，不能只迁移 entries |

RPG 0–100 focus 与 Historian 实验 1–5 focus 不是同一测量：保留单位与源值，显示换算必须标记为派生值。任务数是观察指标，不等于所有 completed actions；避免把每个奖励交易算一次任务。

## 下一阶段适配器（仅设计，未实现）

拟增加独立 `DailyRecordRepository`，先只读投影现有 stores，再逐步允许用户主动提交：

```ts
interface SourceRef {
  system: 'life-rpg' | 'historian'
  origin: string
  workspaceId: string // 显式导入时记录来源身份，不把域名当作个人身份
  entity: 'log' | 'check-in' | 'entry' | 'action'
  sourceId: string
  revisionId?: string
}
interface DailyRecord {
  id: string // 独立 UUID；日期不是唯一键，一天可有多条记录
  localDate: string
  timezone: string // 用户时区；不使用导入时区重新分日
  sources: SourceRef[]
  rawBlocks: { id: string; field: string; text: string; source: SourceRef }[]
  measurements: { name: string; value: number; unit: string; source: SourceRef }[]
  revisionRefs: SourceRef[]
}
interface DailyRecordRepository {
  readDay(date: string): Promise<DailyRecord[]>
  previewSubmission(input: unknown): Promise<unknown> // 展示将写入哪些模块
  commitConfirmedSubmission(planId: string): Promise<void>
}
```

入口按“今天发生了什么”填写一次：原文写入 append-only 记录；用户勾选后才生成 RPG 五字段投影或 Check-in。现有 RPG 日志可作为草稿引用到研究模块，必须展示来源并由用户确认，不能后台生成无出处的“原始现场文字”。任务事实只读关联，适配器永远不调用 complete*、奖励、结算或 reset。分析只可追加到带 sourceRevisionId 的派生对象。

localStorage 与 IndexedDB 无共同原子事务：新记录主存储提交成功后，以持久化 outbox 投影 RPG；每个 operationId 幂等，失败保留待处理项、重试前检查映射，不静默声称双写成功。在实现这一机制与冲突预览前，保持本次各自保存。用户原始文本和修订记录不可被分析或适配器自动覆盖。

## JSON 备份、迁移及去重方案（仅设计）

1. 现状：RPG 设置页导出 version 2 payload；Historian 档案页导出 schemaVersion 1，包含原文、修订及研究集合。建议用户分别导出后再跨域操作。Historian 现有导入、恢复、演示重置为确认后的**整库替换**，不是安全合并；本次保留兼容行为，不把它包装为统一迁移入口。
2. 未来统一 envelope：`product: life-os`、formatVersion、exportedAt、sourceOrigin、workspaceId、各子模块原始 payload 与 SHA-256 校验、适配映射。保留原 envelope/schema version，不改变 originalText 或 revision 时间。JSON 为完整恢复格式；Markdown/CSV 仅作可读输出，不承诺无损修订恢复。
3. 导入先离线解析与严格 schema 验证，限制大小/嵌套深度，拒绝未知未来版本，验证引用与校验值；纯文本处理，不执行 HTML/脚本。预览新增、完全重复、冲突、缺失引用与目标存储空间。迁移前分别建立可下载的完整备份，用户明确确认后执行，不在打开页面或升级版本时自动迁移。
4. 主去重键为 `(system, sourceOrigin, workspaceId, entity, sourceId, revisionId)`；同键且 canonical 内容哈希一致则跳过。不同 ID 即使文本相同也可能是两次真实事件，只提示候选重复，不自动合并。日期相同不能自动删除记录。RPG 同日期不同五字段值作为冲突让用户选择，旧值作为带来源的版本留存。
5. 同键不同内容：保留两份分支及来源信息，用户指定显示版本；originalText 不可覆盖。revision 做 ID+内容校验后的并集，保留原顺序/时间，ID 碰撞创建映射表而非篡改原备份。所有 evidence、hypothesis、experiment 引用按映射重连，无法解析的引用标记，不丢弃。未知字段保留在原 payload。
6. operationId/checkpoint 支持中断恢复；提交前校验目标已读版本，若另一标签页更新则重新预览，不覆盖并发写入。完成后回读比较记录/revision 数、原文哈希、引用完整性及奖励交易未变。回滚也是用户确认的操作，不能抹去迁移后新增记录。
7. 备份与浏览器 profiles 只存在用户本机，不进入 Git、截图、CI artifacts 或远程日志。校验不是加密；后续如增加加密需独立设计密钥恢复。

## 构建与离线

`pnpm build` 自动以四文件白名单复制 Historian 到 `dist/personal-historian/`，旧 Pages 工作流不再重复复制。所有 URL 相对 document/base 与 service-worker scope，兼容 `/life-rpg/#/historian`。

构建生成带内容指纹的 service worker，预缓存 React 入口、带哈希 JS/CSS、PWA 图标、manifest 和研究静态资源。首次成功在线加载主站并完成 worker 激活后，尚未访问过的研究模块也可离线打开。缓存只覆盖构建静态白名单，不缓存用户数据库、备份或其他请求；清理只删除相同 scope 的 Life OS 旧缓存，不清其他应用 CacheStorage 或 IndexedDB。旧 `life-rpg-v0.5-*` 缓存不自动清除，因为不能确定其他子路径的归属。离线首次安装不支持；浏览器清理站点数据会同时清理离线资源与存档，JSON 备份仍有必要。

## 已知限制与后续计划

- iframe 带来两层滚动与独立导航；内层菜单不会进入 React 的路由历史，父页面离开会卸载 iframe，**未点击保存的草稿**不会跨模块保留。已保存的数据保留。这是本次暂时方案的限制。
- 旧独立站没有自行注册新 worker；先在线打开统一主站后，同 scope 兼容入口才具备预缓存离线能力。
- 现有多标签页 Historian 保存是整份 workspace，存在陈旧标签覆盖风险；本次不自动打开第二写入上下文，但独立窗口按钮可能被用户使用。下一阶段需乐观并发/事务协调。
- 现有 Historian IndexedDB 读取失败可能退回演示路径、`persist` 捕获失败后调用者继续展示成功、导入先 normalize 导致格式验证宽松。这些是已有存储可靠性问题，本次没有扩大迁移或重写；下一阶段优先补充严格读取/导入与失败返回测试，禁止错误当作空库后写入样例。
- 下一阶段先完成只读适配与统一 JSON 预览测试，再开发 append-only 原文、幂等投影和用户确认合并，最后逐视图替换 iframe。数据迁移另行评审，不以 UI v0.6 强制升级存档。
