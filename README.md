# TraceNote

> **Web 用户操作录制与回放分析工具**

TraceNote 是一个轻量级的浏览器端工具，用于录制、时间线分析、回放和导出用户在 Web 页面上的操作。它面向前端开发者、UI/UX 设计师、软件测试工程师和 Web 应用调试场景。

## 项目背景

开发者经常需要知道"用户究竟是怎么操作页面的？"——传统方式依靠用户口述复述操作步骤，不仅效率低，而且难以准确复现。TraceNote 通过 DOM 事件监听，将用户的点击、输入、滚动、导航等操作自动捕获为结构化事件数据，并支持时间线查看、回放重现和分析统计。

## 核心功能

| 功能 | 说明 |
|------|------|
| **操作录制** | 录制 click、dblclick、mouseover、keydown、input、scroll、navigation、load 等事件 |
| **结构化事件** | 每个事件记录类型、时间戳、页面、CSS Selector、坐标、内容等字段 |
| **智能 Selector** | 自动生成稳定的 CSS Selector（id > data-* > class > DOM 路径 > 坐标 fallback） |
| **时间线** | SVG 可视化时间轴 + 事件列表，支持点击查看详情 |
| **回放** | 按原始时间间隔顺序执行事件，支持 Click / Input / Scroll / Navigation 回放 |
| **Session 管理** | 基于 IndexedDB 持久化保存录制会话（保存/读取/删除） |
| **操作分析** | 自动统计事件分布、操作间隔、最长停顿点 |
| **导入/导出** | 支持 JSON 格式导出和导入，导入后可直接回放 |
| **敏感信息保护** | 自动检测 password / credit card / token 字段，不保存明文 |

## 技术栈

- **前端框架**: Vue 3 (Composition API) + Vue Router
- **构建工具**: Vite 5
- **存储**: IndexedDB
- **可视化**: SVG 时间轴 + CSS 柱状图
- **样式**: 纯 CSS，Developer Tool 暗色主题

## 系统结构

```
src/
├── models/Event.js         # 事件数据模型
├── recorder/
│   ├── Recorder.js         # 录制引擎（DOM 事件监听）
│   ├── selector.js         # CSS Selector 生成
│   └── sensitive.js        # 敏感字段检测
├── replay/ReplayEngine.js  # 回放引擎
├── storage/SessionStore.js # IndexedDB 持久化
├── analytics/Analytics.js  # 分析引擎
├── router/index.js         # Vue Router 路由
├── views/
│   ├── HomeView.vue        # 主页：录制 + Session 列表
│   ├── SessionView.vue     # 时间线 + 事件详情
│   ├── AnalyticsView.vue   # 分析统计 + 可视化
│   └── ImportView.vue      # 导入/导出
├── assets/main.css         # 全局样式
├── App.vue                 # 根布局
└── main.js                 # 入口
```

## Event 数据结构

```json
{
  "id": "evt-1712345678901-1",
  "type": "click",
  "timestamp": 1240,
  "page": "/login",
  "selector": "#login-button",
  "x": 532,
  "y": 318,
  "value": null,
  "key": null,
  "url": null
}
```

`timestamp` 表示从开始录制到该事件发生的毫秒数。

## Replay 机制

回放引擎按照事件的 `timestamp` 顺序执行，保持原始时间间隔：

1. **Click** — 通过 `document.querySelector(selector)` 查找元素并 dispatch MouseEvent
2. **Input** — 使用 native input value setter 设置值，触发 input + change 事件
3. **Scroll** — 通过 `window.scrollTo` 恢复滚动位置
4. **Navigation** — 通过 `history.pushState` 模拟路由变化

如果某个元素在回放时无法找到（例如动态渲染的内容），引擎会记录 Replay Warning 但不会崩溃。

## Selector 生成策略

为了保证回放的可靠性，不能仅依赖坐标（页面变化后坐标可能失效），TraceNote 使用以下优先级策略生成 CSS Selector：

1. `#id` — 如果元素有唯一 id
2. `[data-*]` — 如果元素有 `data-testid` / `data-cy` / `data-tn` 属性且唯一
3. `tag.class1.class2` — 如果 class 组合在页面中唯一
4. `tag:nth-of-type(n)` 层级路径 — DOM 层级路径
5. **坐标 fallback** — 以上都失败时配合坐标使用

## 为什么不能只记录鼠标坐标

鼠标坐标 `(x, y)` 在录制时的页面上是有效的，但回放时如果页面布局发生变化（窗口缩放、内容加载、响应式布局），坐标就会指向错误的位置甚至空白区域。因此 TraceNote 优先通过 CSS Selector 定位元素，坐标只作为辅助和 fallback。

## 安全设计

- **敏感字段自动 redact**: `type=password`、`name=password`、`autocomplete=current-password` 等字段的内容会被替换为 `[REDACTED]`
- 支持多种属性检测：`type`、`name`、`autocomplete`、`data-sensitive`、`aria-label`、`placeholder`
- 不记录 Cookie、Authorization Header 等 HTTP 层面的敏感信息

## 使用方法

```bash
# 安装依赖
cd tracenote
npm install

# 开发模式
npm run dev

# 生产构建
npm run build
```

打开浏览器访问 `http://localhost:5173`：

1. 点击 **Start Recording** 开始录制
2. 在测试区域中点击按钮、输入文本、滚动列表
3. 点击 **Stop Recording** 停止录制
4. 输入会话名称并保存
5. 点击 **Timeline** 查看事件时间线
6. 点击 **Analyze** 查看操作统计
7. 点击 **Replay** 回放操作
8. 在 Import / Export 页面导出 JSON 或导入已有会话

## 项目难点

- **稳定的 Selector 生成** — 需要确保回放时能准确找到同一元素
- **Input 值设置** — React/Vue 等框架的受控组件需要 native value setter 才能正确触发框架的变更检测
- **时间间隔保持** — 回放时需要合理处理导航/加载等耗时操作
- **敏感字段检测** — 需要覆盖多种输入字段属性组合，避免误判或漏判

## 后续扩展

- [ ] 条件断点：在特定事件前暂停回放
- [ ] 性能分析：结合 Performance API 分析操作响应时间
- [ ] 多人协作：支持 Session 分享和协作分析
- [ ] 录制过滤器：选择性录制特定类型事件
- [ ] 网络请求录制：捕获 XHR / Fetch 请求