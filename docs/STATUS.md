# 项目状态

## 当前版本

`0.5.0`（每日闭环版本）

## 已完成

- 今日仪表盘：等级、XP 进度、心理状态与今日行动。
- 角色编辑：昵称、称号、人生宣言。
- 资本面板：身体、文化、经济、社会、象征、时间六项数值。
- 任务系统：主线/支线、XP 奖励、完成状态与快速新增。
- 日志：完成任务和手动记录都会留下时间线。
- 本地持久化：payload schema version 2，v1 存档可自动迁移。
- 每日 Check-in：睡眠、精力、专注、情绪、压力、自我效能。
- 规则引擎生成今日 3 个关键行动，完成行动会更新 XP、技能、资本、streak 和行动日志。
- 主线行动会推进当前主线的下一条未完成里程碑，并进入每日结算与周报。
- 每日结算与最近 7 天周报。
- localStorage schema v2 迁移、JSON 导入导出保持兼容。
- PWA manifest、service worker、离线缓存、PNG 安装图标和 mobile standalone 支持。
- Supabase `SyncStore` 数据层边界已预留。
- CI/本地质量门禁：typecheck、lint、test、build 均已配置并通过。
- GitHub Pages 发布工作流已配置，启用仓库 Pages 后可自动发布到项目子路径。
- 当前公开站点已发布到 https://life-rpg.tzxbss.chatgpt.site/，访问无需登录。

## 下一阶段

- Supabase 登录、冲突处理和跨设备同步实现。
- 任务标签、重复任务和更细的资本变化记录。
- 可编辑的主线里程碑与技能树解锁。
