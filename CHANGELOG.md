# Changelog

本项目遵循语义化版本，commit message 以 `vX.Y.Z:` 开头。

## v0.3.0

视觉升级（采用 frontend-design skill：拒绝通用 AI 审美，确立街机赛博 RPG HUD 方向）：

- 字体：标题/数字/标签改用 Chakra Petch（科技感、街机风，不再用 Inter）。
- 氛围：深色底叠加 44px 细网格 + 全局胶片噪点 overlay，HUD 质感。
- 卡片：顶部一条渐变高光线，标签字距加大。
- 首页：角色名大号 display 字体；等级做成发光徽章（呼吸光晕）；当前发挥率放大；各区块错峰 fade-up 入场。
- 新增 `animate-fade-up` / `animate-pulse-glow` 工具类。

## v0.2.0

- 新增：支线 / 日常 / 主线任务均可编辑（铅笔按钮），含标题、描述、难度、关联资本/技能、阶段。
- 新增：PWA manifest + 图标，可"安装到主屏幕"离线打开。
- store 新增 `updateSideQuest / updateDailyQuest / updateMainQuest`。

## v0.1.0

- 首版：角色系统、每日 6 项心理状态、发挥率公式、六大资本、主线/支线/日常/随机任务、XP/等级曲线、localStorage 持久化、导出/导入/清空、技能树、日志时间线、8 项成就、人生地图节点图、简单统计、5 步 Onboarding、Demo 角色。
