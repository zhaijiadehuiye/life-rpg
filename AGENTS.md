# Life RPG Agent Guide

## 项目目标
Life RPG 是一个面向日常使用的个人成长仪表盘，帮助用户用角色、资本、心理状态、任务与日志把生活行动化。

## 约定
- `sources/` 是同步的只读参考资料，不要修改。
- 所有产品数据只存于浏览器 localStorage；不要提交用户数据或 secrets。
- 数据结构变更必须更新 `src/lib/storage.ts` 的迁移逻辑与测试。
- 稳定里程碑必须在通过 typecheck、lint、test、build 后提交 Git。
