# v0.6 验收记录

## 范围与方法

2026-10-13，Node.js 24.19.0、pnpm 9.15.9。使用 Chromium 与 Python Playwright，在全新隔离 browser context 中仅创建虚构验收记录和仓库内置 Demo 角色，没有读取、清空或迁移真实用户数据。生产构建通过本地静态服务器分别挂载在 `/life-rpg/` 与域名根路径，验证 GitHub Pages 子路径语义；未部署或修改生产站点。

## 命令结果

| 验收 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store` | 通过，锁文件未变化 |
| `pnpm typecheck` | 通过 |
| `pnpm lint` | 通过 |
| `pnpm test` | 通过：4 文件、13 测试（原有 5 + 导航 2 + 离线缓存 6） |
| `pnpm build` | 通过：React 构建与 Historian 四个静态文件，生成 12 个文件及两种目录入口的预缓存列表 |
| `python3 scripts/browser-smoke.py` | 桌面、移动、首次离线进入及域名根路径共 4 组场景通过 |
| `git diff --check` | 通过 |

使用 `/workspace/.cloud-tools/node_modules/.bin/pnpm` 是环境已准备的 pnpm 9；`--store-dir` 仅避免受限默认 HOME 缓存目录。应用没有增加依赖，pnpm-lock.yaml 保持原样。

## 浏览器实测

- 桌面 1440×1000、移动 390×844。主侧栏/底栏进入 `/#/historian`；研究菜单的 TODAY、TIMELINE、PATTERNS、HYPOTHESES、EXPERIMENTS、PREDICTIONS、REVIEWS、ARCHIVE 全部可打开，移动菜单也全部可点。
- 先通过旧 `/personal-historian/` 页面新增一条虚构记录，再从新 iframe 进入，回读 IndexedDB 验证整个旧 workspace 未改变，同时 RPG 数据未改变。
- iframe 内新增原始记录、保存修订、时间线查看。原始文本和原 revision 保留，currentText 与追加 revision 对应用户新输入；不增加 RPG XP。
- 父路由返回、刷新、首页离开后再次进入，回读确认研究存档保持一致。
- RPG 日志新增及刷新回读、Check-in 保存、关键行动完成、新支线创建/完成全部正常；检查角色 XP、技能与资本增长，已完成状态、任务及日志在刷新后仍在。
- worker 激活后切断 browser context 网络，刷新 React 和 iframe、新增研究记录并再次刷新回读、访问旧静态入口均通过；RPG 存档保持不变。
- 新 context 在线加载主站、**从未访问 Historian**，然后离线直接进入 `/#/historian` 并刷新，工作区正常可用，未创建 RPG 存档。
- 根路径部署下直接进入 Historian 和离线刷新也通过。构建 worker 的相对 URLs 在两种部署位置正确解析。
- 所有场景无 pageerror；父文档与内层工作区无横向溢出。没有对真实部署域名或真实存档做写入。

## 新增自动化回归

`src/test/navigation.test.tsx` 覆盖未创建 RPG 角色的独立入口、桌面及移动导航、模块往返不写入已有存档、主页入口和原任务/技能/日志/XP 不变。

`tests/service-worker.test.js` 覆盖两模块预缓存、scope 限定清理、Pages 子路径的脚本读取、HashRouter fragment 去除、缺失 JS 不回退 HTML、其他应用/私有备份/非 GET 请求不被拦截。

`browser-smoke.py` 保留上述浏览器场景，使用系统 Chromium（可用 `CHROMIUM_PATH` 指定）与 Python Playwright；应用运行不依赖它们。运行前先 `pnpm build`。若环境没有测试工具，可单独准备 `python3 -m pip install playwright` 和受信任的 Chromium。测试新建临时服务器与 browser context，结束自动关闭，不使用日常浏览器 profile。它会更新下方虚构数据截图，不能对真实 origin/profile 运行。

## 页面截图（仅虚构数据）

| 桌面 | 移动 |
| --- | --- |
| [首页模块入口](screenshots/desktop-home.png) | [首页与底栏](screenshots/mobile-home.png) |
| [自我历史学模块](screenshots/desktop-historian.png) | [模块与底栏](screenshots/mobile-historian.png) |
| [已保存修订的时间线](screenshots/desktop-timeline.png) | [时间线](screenshots/mobile-timeline.png) |
| — | [八个研究视图的移动菜单](screenshots/mobile-historian-menu.png) |

## 尚未解决与不在本次范围

iframe 暂时带来独立滚动、独立内层导航和离开模块后未保存草稿丢失。不同域数据必须用户显式导出/导入；没有自动数据合并。现有 Historian 的整库替换导入、多标签页冲突、存储失败反馈与读取失败路径仍需下一阶段可靠性改进，详见[数据适配设计](life-os-v0.6-design.md)。

本次验证为 Chromium 桌面/移动视口，并非真实 iOS Safari 或 Android PWA 安装验收。首次离线安装、浏览器主动清理站点数据、系统存储配额耗尽不保证恢复，仍需 JSON 备份。没有实施第二阶段迁移，没有确认线上部署，也不会自动合并 PR。
