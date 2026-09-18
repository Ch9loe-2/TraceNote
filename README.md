# TraceNote

> **Web 用户操作录制与回放分析工具**
>
> 一个纯浏览器端的轻量级工具，将用户操作捕获为结构化事件数据，支持时间线查看、操作回放、分析统计和 JSON 导入导出。

---

## 项目简介

开发者经常需要知道"用户究竟是怎么操作页面的？"——传统方式依赖用户口述复述操作步骤，不仅效率低，而且难以准确复现。TraceNote 通过 DOM 事件监听，将用户的点击、输入、滚动、导航等操作自动捕获为结构化事件数据，帮助前端开发者、UI/UX 设计师和测试工程师快速了解用户操作路径。

## 核心功能

| 功能 | 说明 |
|------|------|
| **操作录制** | 录制 click、dblclick、mouseover、keydown、input、scroll、navigation、load 共 8 种事件 |
| **结构化事件** | 每个事件记录类型、时间戳、页面路径、CSS Selector、坐标、内容等字段 |
| **智能 Selector 生成** | 自动生成稳定 CSS Selector（id → data-\* 属性 → class 组合 → DOM 层级路径 → 坐标） |
| **时间线视图** | SVG 可视化时间轴 + 事件列表，点击查看事件详情 |
| **操作回放** | 按原始时间间隔顺序执行事件，支持 Click / Input / Scroll / Navigation |
| **Session 管理** | 基于 IndexedDB 持久化，支持保存、读取、删除录制会话 |
| **操作分析** | 自动统计事件分布、操作间隔、最长停顿点（用于发现用户卡顿位置） |
| **导入/导出** | 支持单 Session 和批量 JSON 导出，导入后可直接回放 |
| **敏感信息保护** | 自动检测 password / credit card / token 字段，不保存明文 |
| **安全删除** | 密码输入在录制和回放中均被替换为 `[REDACTED]`，永不泄漏 |

## 技术栈

- **前端框架**: Vue 3 (Composition API) + Vue Router 4
- **构建工具**: Vite 5
- **存储**: IndexedDB
- **可视化**: SVG 时间轴 + CSS 柱状图
- **样式**: 纯 CSS，Developer Tool 暗色主题
- **无后端依赖**: 纯浏览器端运行，无需服务器

## 项目结构

```
src/
├── models/Event.js              # 事件数据模型
├── recorder/
│   ├── Recorder.js              # 录制引擎（DOM 事件监听）
│   ├── selector.js              # CSS Selector 生成
│   └── sensitive.js             # 敏感字段检测
├── replay/ReplayEngine.js       # 回放引擎
├── storage/SessionStore.js      # IndexedDB 持久化
├── analytics/Analytics.js       # 分析引擎
├── router/index.js              # Vue Router 路由配置
├── views/
│   ├── HomeView.vue             # 主页：录制 + Session 列表
│   ├── SessionView.vue          # 时间线 + 事件详情（单 Session）
│   ├── TimelineView.vue         # 时间线概览页
│   ├── AnalyticsView.vue        # 分析统计概览页
│   ├── AnalyticsDetailView.vue  # 单 Session 分析详情
│   ├── ImportView.vue           # 导入/导出
│   └── SettingsView.vue         # 设置与关于
├── assets/main.css              # 全局样式
├── App.vue                      # 根布局（侧边栏 + 内容区）
└── main.js                      # 应用入口
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

- **`timestamp`**: 从开始录制到该事件发生的毫秒数（使用 `performance.now()`）
- **`selector`**: 自动生成的 CSS Selector，用于回放定位
- **`value`**: Input 事件的值，敏感字段替换为 `[REDACTED]`
- **`x` / `y`**: 鼠标坐标（可选，作为定位 fallback）

## 安装运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

## 使用方式

1. 打开 `http://localhost:5173`
2. 点击 **Start Recording** 开始录制
3. 在测试区域中点击按钮、输入文本、滚动列表（或访问其他页面）
4. 点击 **Stop Recording** 停止录制
5. 输入会话名称并保存
6. 在侧边栏切换页面查看：
   - **Timeline**: 查看事件时间线和详情
   - **Analytics**: 查看操作统计和停顿分析
   - **Import / Export**: 导出 JSON 或导入已有会话
   - **Settings**: 查看系统信息、清除数据

## 核心技术实现

### Selector 生成策略（为什么不能只靠坐标）

鼠标坐标 `(x, y)` 在录制时指向正确的元素，但回放时如果页面布局变化（窗口缩放、内容加载、响应式布局），坐标会指向错误位置甚至空白区域。

TraceNote 采用多优先级 CSS Selector 生成策略：

1. `#id` — 如果元素有唯一 id
2. `[data-testid]` / `[data-cy]` / `[data-tn]` — 针对测试框架友好的自定义属性
3. `tag.class1.class2` — 如果 class 组合在页面中唯一
4. `tag:nth-of-type(n)` 层级路径 — DOM 层级定位，适用于没有 id/class 的元素
5. 坐标 fallback — 以上所有方式都无法唯一定位时，配合坐标使用

### Replay 机制

回放引擎按事件 `timestamp` 顺序执行，保持原始操作间隔：

- **Click**: 通过 `document.querySelector` 查找元素，dispatch `MouseEvent`
- **Input**: 使用 `HTMLInputElement.prototype.value` 的 native setter 设置值（解决 React/Vue 受控组件问题），触发 input + change 事件
- **Scroll**: 通过 `window.scrollTo` 恢复滚动位置
- **Navigation**: 通过 `history.pushState` 模拟路由变化

无法定位的元素不会导致整个回放崩溃——引擎会记录 Warning 后继续执行后续事件。

### 敏感信息保护

```
检测维度:      type=password / name=password / autocomplete=current-password
              / aria-label/placeholder 含 "password" 等关键词
处理方式:      录制 → [REDACTED]
              回放 → 跳过，不写入真实值
```

## 数据存储

- **引擎**: IndexedDB
- **数据库连接**: 单例模式复用，避免反复打开
- **Session 结构**: `{ id, name, createdAt, duration, eventCount, page, events[] }`
- **索引**: 按 `createdAt` 降序排列
- **数据安全**: 敏感字段在写入前已替换为 `[REDACTED]`

## 安全设计

- 密码输入自动 redact（录制 + 回放双保护）
- 支持检测 `type` / `name` / `autocomplete` / `data-sensitive` / `aria-label` / `placeholder`
- 不记录 Cookie、Authorization Header 等 HTTP 层面敏感信息
- 所有代码无 API Key、Token、密码硬编码
- `.gitignore` 已配置忽略 `node_modules/`、`dist/`、`.env`、`*.local`

## 测试

包含 13 项 E2E 自动化测试（puppeteer-core + 系统 Chrome），覆盖：

- 首页加载和空状态
- 录制启动/停止
- Click、Input 事件捕获
- 密码敏感信息保护
- Session 保存和列表
- Timeline / Analytics / Settings / Import 页面
- Hash 路由直接访问
- 多次录制和清除操作

```bash
# 确保开发服务器运行
npm run dev

# 另一个终端运行测试
node test-e2e.mjs
```

## 项目亮点

- **纯浏览器端运行**：无需后端、无需数据库、无需部署，开箱即用
- **模块化架构**：Event 模型、Recorder、ReplayEngine、SessionStore、Analytics 完全独立
- **智能 Selector 生成**：5 级优先级策略，回放可靠性高
- **受控组件兼容**：正确触发 React/Vue 框架的变更检测
- **安全设计**：敏感字段录制和回放双保护

## 构建大小

| 资源 | 大小 | Gzip |
|------|------|------|
| JS (主入口) | 142 KB | 50 KB |
| CSS | 20 KB | 4 KB |
| 首页 HTML | 0.4 KB | 0.3 KB |
| **总计** | **~163 KB** | **~55 KB** |

## 后续扩展方向

- [ ] 条件断点：在特定事件前暂停回放
- [ ] 性能分析：结合 Performance API 分析操作响应时间
- [ ] 录制过滤器：选择性录制特定类型事件
- [ ] 键盘快捷操作优化
- [ ] 自定义测试区域集成

