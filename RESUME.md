## TraceNote — Web 用户操作录制与回放分析工具

**技术栈**: Vue 3, Vite 5, IndexedDB, DOM API, JavaScript (ES Modules), Puppeteer (E2E 测试)

**项目概述**：
纯浏览器端轻量级用户操作录制与回放分析工具，面向前端开发者、UI/UX 设计师和测试工程师。无需后端服务。

**核心职责与实现**：

- **录制引擎**：基于 DOM EventListener 实现，支持 click / dblclick / mouseover / keydown / input / scroll / navigation / load 共 8 种事件捕获，使用 `performance.now()` 高精度时间戳记录操作间隔
- **智能 CSS Selector 生成**：5 级优先级策略（id → data-\* 属性 → class 组合 → DOM 层级路径 → 坐标 fallback），不依赖单一方式，提升回放可靠性
- **回放引擎**：按事件时间戳和原始间隔顺序执行，保持操作节奏；Input 使用 native value setter 解决 React/Vue 受控组件兼容问题；无法定位的元素记录 Warning 后继续执行，不崩溃
- **数据持久化**：基于 IndexedDB 实现 Session CRUD，数据库连接单例复用；支持单 Session 和批量 JSON 导入/导出，导入后可直接回放
- **分析引擎**：自动统计事件分布、操作间隔分析、最长停顿点定位（用于发现用户卡顿位置），使用 SVG 时间轴和 CSS 柱状图可视化
- **安全处理**：敏感字段自动检测（type=password / name=password / autocomplete=current-password 等），录制和回放双阶段保持 [REDACTED]，不泄漏明文
- **组件化架构**：Event 模型、Recorder、ReplayEngine、SessionStore、Analytics 完全独立模块，视图与业务逻辑分离

**项目地址**: https://github.com/Ch9loe-2/TraceNote