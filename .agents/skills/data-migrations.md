# Data migration skill

- `src/lib/storage.ts` 的 `CURRENT_VERSION` 必须递增维护。
- 读取旧数据时先做结构化迁移，再交给 UI；迁移必须保持幂等。
- 新字段必须提供安全默认值，未知字段可以保留但不能阻塞启动。
