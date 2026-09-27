# Life RPG · 人生 RPG

一个真正每天可以使用的个人成长仪表盘：用角色、资本、心理状态、主线/支线任务、XP 和日志，把生活变成可回顾的 RPG。

## 快速开始

```bash
pnpm install
pnpm dev
```

## 质量检查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 核心设计

- **低摩擦**：首页直接回答“我是谁、今天做什么、最近状态怎样”。
- **可恢复**：所有数据通过版本化 localStorage 保存，未来可迁移。
- **可行动**：完成任务马上获得 XP，并写入日志，形成正反馈。

详见 [docs/STATUS.md](docs/STATUS.md) 与 [CHANGELOG.md](CHANGELOG.md)。
