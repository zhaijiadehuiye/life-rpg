# v0.6 验收记录

## 范围与方法

2026-10-15，Node.js 24.19.0、pnpm 11.25.0。使用 Chromium 与 Python Playwright，在全新隔离 browser context 中仅创建虚构验收记录和仓库内置 Demo 角色，没有读取、清空或迁移真实用户数据。生产构建通过本地静态服务器分别挂载在 `/life-rpg/` 与域名根路径，验证 GitHub Pages 子路径语义；正式版只通过用户审阅后的 PR 发布，没有直接改写或迁移存档。

## 命令结果

| 验收 | 结果 |
| --- | --- |
| `CI=true pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store` | 通过，锁文件未变化；本地忽略配置只允许 esbuild 安装脚本 |
| `pnpm --config.verify-deps-before-run=false typecheck` | 通过 |
| `pnpm --config.verify-deps-before-run=false lint` | 通过 |
| `pnpm --config.verify-deps-before-run=false test` | 通过：4 文件、17 测试（含每日自评分/日常字段保存、旧存档字段兼容、同日修改幂等） |
| `pnpm --config.verify-deps-before-run=false build` | 通过：React 构建与 Historian 四个静态文件，生成 12 个文件及两种目录入口的预缓存列表 |
| `python3 scripts/browser-smoke.py` | 桌面、移动、首次离线进入、域名根路径及减少动态效果共 5 组场景通过 |
| `git diff --check` | 通过 |

该云环境的 `HOME` 缓存目录不可写，因此安装显式使用 `/workspace/.pnpm-store`。pnpm 在运行脚本前会尝试自动安装依赖，故验证命令关闭了这次重复检查；冻结安装已先完成。`pnpm-workspace.yaml` 是被 Git 忽略的本地配置，不会提交。应用没有增加依赖，pnpm-lock.yaml 保持原样。

## 浏览器实测

- 桌面 1440×1000、移动 390×844。主侧栏/底栏进入 `/#/historian`；研究菜单的 TODAY、TIMELINE、PATTERNS、HYPOTHESES、EXPERIMENTS、PREDICTIONS、REVIEWS、ARCHIVE 全部可打开，移动菜单也全部可点。
- 先通过旧 `/personal-historian/` 页面新增一条虚构记录，再从新 iframe 进入，回读 IndexedDB 验证整个旧 workspace 未改变，同时 RPG 数据未改变。
- iframe 内新增原始记录、保存修订、时间线查看。原始文本和原 revision 保留，currentText 与追加 revision 对应用户新输入；不增加 RPG XP。
- 父路由返回、刷新、首页离开后再次进入，回读确认研究存档保持一致。
- RPG 每日记录的 1–10 分、自选醒来时间、饮食、日常、不顺心的事、运动状态与补充文字保存及刷新回读正常；旧日志仍显示，修改同一天不会新增日志或重复推进连续记录成就。Check-in 保存、关键行动完成、新支线创建/完成全部正常；检查角色 XP、技能与资本增长，已完成状态、任务及日志在刷新后仍在。
- worker 激活后切断 browser context 网络，刷新 React 和 iframe、新增研究记录并再次刷新回读、访问旧静态入口均通过；RPG 存档保持不变。
- 新 context 在线加载主站、**从未访问 Historian**，然后离线直接进入 `/#/historian` 并刷新，工作区正常可用，未创建 RPG 存档。
- 根路径部署下直接进入 Historian 和离线刷新也通过。构建 worker 的相对 URLs 在两种部署位置正确解析。
- 桌面与移动端打开中文使用说明；无需 RPG 存档也能进入说明。按中文类别创建固定习惯，确认只写入习惯列表，完成一次并刷新后仍保留。
- 首页说明状态记录、行动建议和自己安排的计划彼此不同且都可跳过；新手引导、每日记录、计划页与备份说明均可访问。
- 每次切换主应用路由都回到页面顶部，避免从长首页进入计划时落在列表中段。
- 浏览器确认首页所有入场内容的透明度动画最终结束并可见；减少动态效果偏好下也会直接显示。
- 所有场景无 pageerror；父文档与内层工作区无横向溢出。没有对真实部署域名或真实存档做写入。

## 新增自动化回归

`src/test/navigation.test.tsx` 覆盖未创建 RPG 角色的独立入口、中文说明入口、桌面及移动导航、模块往返不写入已有存档、中文计划表单创建并保存固定习惯、每日记录字段保存和同日修改。`src/test/storage.test.ts` 确认 v1 日志迁移保留原内容并且不伪造新字段。

`tests/service-worker.test.js` 覆盖两模块预缓存、scope 限定清理、Pages 子路径的脚本读取、HashRouter fragment 去除、缺失 JS 不回退 HTML、其他应用/私有备份/非 GET 请求不被拦截。

`browser-smoke.py` 保留上述浏览器场景，使用系统 Chromium（可用 `CHROMIUM_PATH` 指定）与 Python Playwright；应用运行不依赖它们。运行前先 `pnpm build`。若环境没有测试工具，可单独准备 `python3 -m pip install playwright` 和受信任的 Chromium。测试新建临时服务器与 browser context，结束自动关闭，不使用日常浏览器 profile。它会更新下方虚构数据截图，不能对真实 origin/profile 运行。

## 页面截图（仅虚构数据）

| 桌面 | 移动 |
| --- | --- |
| [首页模块入口](screenshots/desktop-home.png) | [首页与底栏](screenshots/mobile-home.png) |
| [每日评分与日常记录](screenshots/desktop-journal.png) | [每日评分与日常记录](screenshots/mobile-journal.png) |
| [中文使用说明](screenshots/desktop-guide.png) | [中文使用说明首屏](screenshots/mobile-guide.png) |
| [计划与目标](screenshots/desktop-plan.png) | [计划与目标首屏](screenshots/mobile-plan.png) |
| [添加固定习惯](screenshots/desktop-create-plan.png) | [添加固定习惯首屏](screenshots/mobile-create-plan.png) |
| [自我历史学模块](screenshots/desktop-historian.png) | [模块与底栏](screenshots/mobile-historian.png) |
| [已保存修订的时间线](screenshots/desktop-timeline.png) | [时间线](screenshots/mobile-timeline.png) |
| — | [八个研究视图的移动菜单](screenshots/mobile-historian-menu.png) |

## 尚未解决与不在本次范围

iframe 暂时带来独立滚动、独立内层导航和离开模块后未保存草稿丢失。不同域数据必须用户显式导出/导入；没有自动数据合并。现有 Historian 的整库替换导入、多标签页冲突、存储失败反馈与读取失败路径仍需下一阶段可靠性改进，详见[数据适配设计](life-os-v0.6-design.md)。

本次验证为 Chromium 桌面/移动视口，并非真实 iOS Safari 或 Android PWA 安装验收。首次离线安装、浏览器主动清理站点数据、系统存储配额耗尽不保证恢复，仍需 JSON 备份。本次没有实施第二阶段数据迁移，也没有新增任何跨模块自动合并。

## GitHub Pages pull request preview

The Pages workflow now builds current `main` separately, adds the PR artifact under `/previews/pr-<number>/`, and deploys the main artifact and preview together. The production root stays at the same main commit; preview paths have their own relative URLs and service-worker scope. Closing the PR rebuilds and publishes main alone, removing the preview. PR build artifacts expire after 3 days and are not used as long-lived user storage. The workflow deployment itself is validated by the live preview run attached to this PR; local browser acceptance above validates both project-base and domain-root serving.
