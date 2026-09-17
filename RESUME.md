## TraceNote — Web 用户操作录制与回放分析工具

**技术栈**: Vue 3, Vite, IndexedDB, DOM API, JavaScript (ES Modules), CSS Selector

**项目概述**：
开发了一个纯浏览器端的轻量级用户操作录制与回放分析工具，面向前端开发者、UI/UX 设计师和测试工程师。

**核心职责与实现**：

- **录制引擎**：基于 DOM EventListener 实现，支持监听 click / dblclick / mouseover / keydown / input / scroll / navigation 等事件，以高精度时间戳（performance.now）记录从录制开始到事件发生的毫秒数
- **智能 CSS Selector 生成**：实现了多优先级策略——优先使用 id，其次 data-* 属性、唯一 class 组合、DOM 层级路径（nth-of-type），最后坐标作为 fallback；不依赖单一定位方式，提升回放可靠性
- **回放引擎**：按事件先后顺序和原始时间间隔执行回放，保持操作节奏；针对 React / Vue 受控组件 input 使用 native value setter 解决问题；无法定位的元素不会导致整个回放崩溃，而是记录 Warning 后继续
- **数据持久化**：基于 IndexedDB 实现 Session 的保存、读取、删除；支持 JSON 导入/导出，导入后可直接回放
- **分析引擎**：自动统计事件类型分布、操作间隔、最长停顿点（用于发现用户卡顿位置），使用 SVG 时间轴和 CSS 柱状图可视化
- **安全处理**：实现敏感字段自动检测（type=password / name=password / autocomplete=current-password 等），录制时替换为 [REDACTED]，不保存明文
- **组件化架构**：Event 模型、Recorder、ReplayEngine、SessionStore、Analytics 完全独立模块化，视图与业务逻辑分离

**项目地址**: https://github.com/Ch9loe-2/TraceNote