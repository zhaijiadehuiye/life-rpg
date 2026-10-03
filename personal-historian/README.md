# Personal Historian / 自我历史学

这是 Personal Historian 的本地优先 MVP 备份。

## 当前版本

- TODAY / TIMELINE / PATTERNS / HYPOTHESES / EXPERIMENTS / PREDICTIONS / REVIEWS / ARCHIVE
- 原始记录与 revision history
- IndexedDB 本地持久化
- JSON、Markdown、CSV 导入导出与本机快照
- 当前分析层为可替换的本地结构化分析实现

## 本地运行

在本目录运行任意静态服务器，例如：

```bash
python3 -m http.server 4173
```

然后打开 `http://localhost:4173`。

数据保存在浏览器 IndexedDB。换设备前请使用 Archive 导出 JSON。

## 在线版本

https://personal-historian.tzxbss.chatgpt.site

## 数据原则

原始材料不可被分析层覆盖；编辑会追加 revision。假设置信度与实验观察保留历史记录。
